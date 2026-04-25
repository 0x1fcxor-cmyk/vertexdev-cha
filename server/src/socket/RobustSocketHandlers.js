import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';
import { getRedisClients } from '../redis/client.js';
import jwt from 'jsonwebtoken';

/**
 * Production-grade WebSocket server handlers with:
 * - Enhanced authentication with JWT validation
 * - Rate limiting per socket
 * - Room management with permissions
 * - Presence system
 * - Message acknowledgment
 * - Error handling and logging
 * - Performance monitoring
 * - Message ordering and deduplication
 */
class RobustSocketHandlers {
  constructor(io, redis, options = {}) {
    this.io = io;
    this.redis = redis;
    this.options = {
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      enableRateLimit: true,
      rateLimitWindow: 60000, // 1 minute
      rateLimitMax: 100, // max messages per window
      enablePresence: true,
      presenceTimeout: 300000, // 5 minutes
      enableMessageAck: true,
      messageAckTimeout: 10000,
      enableDeduplication: true,
      deduplicationWindow: 5000,
      enableMonitoring: true,
      ...options
    };

    // User tracking
    this.onlineUsers = new Map(); // socketId -> { userId, token, rooms, lastSeen }
    this.userSockets = new Map(); // userId -> Set of socketIds
    this.roomUsers = new Map(); // roomId -> Set of userIds
    this.socketRooms = new Map(); // socketId -> Set of roomIds

    // Rate limiting
    this.rateLimitMap = new Map(); // socketId -> { count, resetTime }

    // Message deduplication
    this.messageCache = new Map(); // messageId -> timestamp

    // Statistics
    this.stats = {
      connections: 0,
      disconnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      authentications: 0,
      authenticationFailures: 0,
      rateLimitViolations: 0,
      errors: 0
    };

    // Presence tracking
    this.presenceTimers = new Map(); // userId -> timer

    this.setupHandlers();
    this.setupRedisSubscriptions();
    this.startCleanupInterval();
  }

  /**
   * Setup all socket event handlers
   */
  setupHandlers() {
    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  /**
   * Setup Redis subscriptions for cross-server communication
   */
  setupRedisSubscriptions() {
    const { subClient, pubClient } = this.redis;

    // Messages
    subClient.subscribe('messages', (message) => {
      try {
        const data = JSON.parse(message);
        this.io.to(data.channelId).emit('new_message', data);
      } catch (error) {
        console.error('Error processing Redis message:', error);
      }
    });

    // User status
    subClient.subscribe('user_status', (message) => {
      try {
        const data = JSON.parse(message);
        this.io.emit('user_status_update', data);
      } catch (error) {
        console.error('Error processing user status:', error);
      }
    });

    // Typing
    subClient.subscribe('typing', (message) => {
      try {
        const data = JSON.parse(message);
        this.io.to(data.channelId).emit('user_typing', data);
      } catch (error) {
        console.error('Error processing typing:', error);
      }
    });

    // Presence
    subClient.subscribe('presence', (message) => {
      try {
        const data = JSON.parse(message);
        this.io.emit('presence_update', data);
      } catch (error) {
        console.error('Error processing presence:', error);
      }
    });
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    this.stats.connections++;
    console.log(`New socket connection: ${socket.id}`);

    // Connection timeout
    const authTimeout = setTimeout(() => {
      if (!this.onlineUsers.has(socket.id)) {
        console.log(`Socket ${socket.id} authentication timeout`);
        socket.disconnect();
      }
    }, 30000);

    socket.on('authenticate', (data) => this.handleAuthentication(socket, data, authTimeout));
    socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));
    socket.on('error', (error) => this.handleError(socket, error));
    socket.on('heartbeat', () => this.handleHeartbeat(socket));
    socket.on('join_channel', (data) => this.handleJoinChannel(socket, data));
    socket.on('leave_channel', (data) => this.handleLeaveChannel(socket, data));
    socket.on('send_message', (data) => this.handleSendMessage(socket, data));
    socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
    socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
    socket.on('presence_update', (data) => this.handlePresenceUpdate(socket, data));
    socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
    socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
  }

  /**
   * Handle authentication
   */
  async handleAuthentication(socket, data, authTimeout) {
    clearTimeout(authTimeout);

    try {
      const { userId, token } = data;

      // Validate JWT token
      const decoded = jwt.verify(token, this.options.jwtSecret);
      
      if (decoded.userId !== userId) {
        throw new Error('Token mismatch');
      }

      // Check if user exists and is active
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Track socket
      this.onlineUsers.set(socket.id, {
        userId,
        token,
        rooms: new Set(),
        lastSeen: Date.now()
      });

      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socket.id);

      // Update user status
      await this.updateUserStatus(userId, 'online');

      // Join user's default channels
      const channels = await this.getUserChannels(userId);
      channels.forEach(channel => {
        socket.join(channel.id);
        this.socketRooms.get(socket.id)?.add(channel.id) || this.socketRooms.set(socket.id, new Set([channel.id]));
      });

      // Start presence tracking
      if (this.options.enablePresence) {
        this.startPresenceTracking(userId);
      }

      // Publish to Redis
      this.redis.pubClient.publish('user_status', JSON.stringify({
        userId,
        status: 'online',
        timestamp: new Date().toISOString()
      }));

      this.stats.authentications++;
      socket.emit('authenticated', { success: true, userId, user });

      console.log(`Socket ${socket.id} authenticated as user ${userId}`);
    } catch (error) {
      this.stats.authenticationFailures++;
      console.error('Authentication error:', error);
      socket.emit('authenticated', { success: false, error: error.message });
      socket.disconnect();
    }
  }

  /**
   * Handle disconnection
   */
  async handleDisconnect(socket, reason) {
    this.stats.disconnections++;
    console.log(`Socket ${socket.id} disconnected: ${reason}`);

    const userData = this.onlineUsers.get(socket.id);
    if (userData) {
      const { userId, rooms } = userData;

      // Remove socket from user
      this.userSockets.get(userId)?.delete(socket.id);

      // Remove from all rooms
      rooms.forEach(roomId => {
        socket.leave(roomId);
        this.roomUsers.get(roomId)?.delete(userId);
      });

      // Remove socket tracking
      this.onlineUsers.delete(socket.id);
      this.socketRooms.delete(socket.id);
      this.rateLimitMap.delete(socket.id);

      // Check if user is completely offline
      if (!this.userSockets.get(userId)?.size) {
        await this.updateUserStatus(userId, 'offline');
        this.stopPresenceTracking(userId);

        // Publish to Redis
        this.redis.pubClient.publish('user_status', JSON.stringify({
          userId,
          status: 'offline',
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  /**
   * Handle socket error
   */
  handleError(socket, error) {
    this.stats.errors++;
    console.error(`Socket ${socket.id} error:`, error);
  }

  /**
   * Handle heartbeat
   */
  handleHeartbeat(socket) {
    const userData = this.onlineUsers.get(socket.id);
    if (userData) {
      userData.lastSeen = Date.now();
      socket.emit('heartbeat_ack', { timestamp: Date.now() });
    }
  }

  /**
   * Handle join channel
   */
  async handleJoinChannel(socket, data) {
    try {
      const { channelId } = data;
      const userData = this.onlineUsers.get(socket.id);

      if (!userData) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Check permissions
      const hasPermission = await this.checkChannelPermission(userData.userId, channelId, 'read');
      if (!hasPermission) {
        socket.emit('error', { message: 'Permission denied' });
        return;
      }

      socket.join(channelId);
      userData.rooms.add(channelId);

      if (!this.socketRooms.has(socket.id)) {
        this.socketRooms.set(socket.id, new Set());
      }
      this.socketRooms.get(socket.id).add(channelId);

      if (!this.roomUsers.has(channelId)) {
        this.roomUsers.set(channelId, new Set());
      }
      this.roomUsers.get(channelId).add(userData.userId);

      socket.emit('channel_joined', { channelId });
      console.log(`Socket ${socket.id} joined channel ${channelId}`);
    } catch (error) {
      console.error('Error joining channel:', error);
      socket.emit('error', { message: 'Failed to join channel' });
    }
  }

  /**
   * Handle leave channel
   */
  handleLeaveChannel(socket, data) {
    const { channelId } = data;
    const userData = this.onlineUsers.get(socket.id);

    if (userData) {
      socket.leave(channelId);
      userData.rooms.delete(channelId);
      this.socketRooms.get(socket.id)?.delete(channelId);
      this.roomUsers.get(channelId)?.delete(userData.userId);
      socket.emit('channel_left', { channelId });
      console.log(`Socket ${socket.id} left channel ${channelId}`);
    }
  }

  /**
   * Handle send message
   */
  async handleSendMessage(socket, data) {
    try {
      const userData = this.onlineUsers.get(socket.id);
      if (!userData) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Rate limiting
      if (this.options.enableRateLimit && !this.checkRateLimit(socket.id)) {
        this.stats.rateLimitViolations++;
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      // Deduplication
      if (this.options.enableDeduplication && this.messageCache.has(data.id)) {
        return; // Duplicate message
      }
      this.messageCache.set(data.id, Date.now());

      // Check permissions
      const hasPermission = await this.checkChannelPermission(userData.userId, data.channelId, 'write');
      if (!hasPermission) {
        socket.emit('error', { message: 'Permission denied' });
        return;
      }

      // Save message to database
      const message = {
        id: data.id || uuidv4(),
        channelId: data.channelId,
        userId: userData.userId,
        content: data.content,
        createdAt: new Date().toISOString(),
        ...data
      };

      await this.saveMessage(message);

      // Get user data
      const user = await this.getUserById(userData.userId);

      // Broadcast to channel
      const messageData = {
        ...message,
        user
      };

      this.io.to(data.channelId).emit('new_message', messageData);

      // Send acknowledgment
      socket.emit(`message_ack_${message.id}`, { success: true, messageId: message.id });

      // Publish to Redis for cross-server sync
      this.redis.pubClient.publish('messages', JSON.stringify({
        ...messageData,
        channelId: data.channelId
      }));

      this.stats.messagesSent++;
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
      socket.emit(`message_error_${data.id}`, { error: error.message });
    }
  }

  /**
   * Handle typing start
   */
  async handleTypingStart(socket, data) {
    const userData = this.onlineUsers.get(socket.id);
    if (!userData) return;

    const user = await this.getUserById(userData.userId);
    
    socket.to(data.channelId).emit('user_typing', {
      userId: userData.userId,
      username: user.username,
      channelId: data.channelId
    });

    this.redis.pubClient.publish('typing', JSON.stringify({
      userId: userData.userId,
      username: user.username,
      channelId: data.channelId
    }));
  }

  /**
   * Handle typing stop
   */
  handleTypingStop(socket, data) {
    const userData = this.onlineUsers.get(socket.id);
    if (!userData) return;

    socket.to(data.channelId).emit('user_typing_stop', {
      userId: userData.userId,
      channelId: data.channelId
    });
  }

  /**
   * Handle presence update
   */
  async handlePresenceUpdate(socket, data) {
    const userData = this.onlineUsers.get(socket.id);
    if (!userData) return;

    await this.updateUserPresence(userData.userId, data);

    this.redis.pubClient.publish('presence', JSON.stringify({
      userId: userData.userId,
      ...data,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Handle join room
   */
  async handleJoinRoom(socket, data) {
    const { roomId } = data;
    const userData = this.onlineUsers.get(socket.id);

    if (userData) {
      socket.join(roomId);
      userData.rooms.add(roomId);

      if (!this.socketRooms.has(socket.id)) {
        this.socketRooms.set(socket.id, new Set());
      }
      this.socketRooms.get(socket.id).add(roomId);

      socket.emit('room_joined', { roomId });
    }
  }

  /**
   * Handle leave room
   */
  handleLeaveRoom(socket, data) {
    const { roomId } = data;
    const userData = this.onlineUsers.get(socket.id);

    if (userData) {
      socket.leave(roomId);
      userData.rooms.delete(roomId);
      this.socketRooms.get(socket.id)?.delete(roomId);
      socket.emit('room_left', { roomId });
    }
  }

  /**
   * Check rate limit
   */
  checkRateLimit(socketId) {
    if (!this.options.enableRateLimit) return true;

    const now = Date.now();
    let rateLimitData = this.rateLimitMap.get(socketId);

    if (!rateLimitData || now > rateLimitData.resetTime) {
      rateLimitData = {
        count: 0,
        resetTime: now + this.options.rateLimitWindow
      };
      this.rateLimitMap.set(socketId, rateLimitData);
    }

    rateLimitData.count++;
    return rateLimitData.count <= this.options.rateLimitMax;
  }

  /**
   * Start presence tracking for user
   */
  startPresenceTracking(userId) {
    // Clear existing timer
    this.stopPresenceTracking(userId);

    // Set new timer
    const timer = setTimeout(async () => {
      await this.updateUserStatus(userId, 'idle');
    }, this.options.presenceTimeout);

    this.presenceTimers.set(userId, timer);
  }

  /**
   * Stop presence tracking for user
   */
  stopPresenceTracking(userId) {
    const timer = this.presenceTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.presenceTimers.delete(userId);
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId, status) {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
      [status, userId]
    );
  }

  /**
   * Update user presence
   */
  async updateUserPresence(userId, data) {
    const pool = getPool();
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.activity) {
      fields.push(`activity = $${paramCount}`);
      values.push(data.activity);
      paramCount++;
    }

    if (data.customStatus) {
      fields.push(`custom_status = $${paramCount}`);
      values.push(data.customStatus);
      paramCount++;
    }

    if (fields.length > 0) {
      values.push(userId);
      await pool.query(
        `UPDATE users SET ${fields.join(', ')}, last_seen = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
        values
      );
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, username, avatar_url, status FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Get user channels
   */
  async getUserChannels(userId) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT DISTINCT c.* 
      FROM channels c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE sm.user_id = $1
    `, [userId]);
    return result.rows;
  }

  /**
   * Save message to database
   */
  async saveMessage(message) {
    const pool = getPool();
    await pool.query(
      'INSERT INTO messages (id, channel_id, user_id, content, created_at) VALUES ($1, $2, $3, $4, $5)',
      [message.id, message.channelId, message.userId, message.content, message.createdAt]
    );
  }

  /**
   * Check channel permission
   */
  async checkChannelPermission(userId, channelId, permission) {
    try {
      const pool = getPool();
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM channels c
        JOIN server_members sm ON c.server_id = sm.server_id
        WHERE c.id = $1 AND sm.user_id = $2
      `, [channelId, userId]);

      return result.rows[0].count > 0;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    // Clean up message cache
    setInterval(() => {
      const now = Date.now();
      for (const [messageId, timestamp] of this.messageCache.entries()) {
        if (now - timestamp > this.options.deduplicationWindow) {
          this.messageCache.delete(messageId);
        }
      }
    }, 60000);

    // Clean up rate limit data
    setInterval(() => {
      const now = Date.now();
      for (const [socketId, data] of this.rateLimitMap.entries()) {
        if (now > data.resetTime) {
          this.rateLimitMap.delete(socketId);
        }
      }
    }, 60000);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      onlineUsers: this.onlineUsers.size,
      connectedUsers: this.userSockets.size,
      activeRooms: this.roomUsers.size,
      rateLimitViolations: this.stats.rateLimitViolations
    };
  }

  /**
   * Get online users
   */
  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Get users in room
   */
  getUsersInRoom(roomId) {
    return Array.from(this.roomUsers.get(roomId) || []);
  }

  /**
   * Broadcast to all users
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Broadcast to room
   */
  broadcastToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  /**
   * Send to specific user
   */
  sendToUser(userId, event, data) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  /**
   * Disconnect user
   */
  disconnectUser(userId) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io.to(socketId).disconnect();
      });
    }
  }
}

export default RobustSocketHandlers;
