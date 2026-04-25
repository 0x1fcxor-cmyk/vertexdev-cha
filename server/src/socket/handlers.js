import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';
import { getRedisClients } from '../redis/client.js';

const onlineUsers = new Map(); // socketId -> userId
const userSockets = new Map(); // userId -> Set of socketIds

export function setupSocketHandlers(io, redis) {
  const { subClient, pubClient } = redis;

  // Subscribe to Redis channels for cross-server communication
  subClient.subscribe('messages', (message) => {
    const data = JSON.parse(message);
    io.to(data.channelId).emit('new_message', data);
  });

  subClient.subscribe('user_status', (message) => {
    const data = JSON.parse(message);
    io.emit('user_status_update', data);
  });

  subClient.subscribe('typing', (message) => {
    const data = JSON.parse(message);
    io.to(data.channelId).emit('user_typing', data);
  });

  // Connection handling
  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Authentication
    socket.on('authenticate', async ({ userId, token }) => {
      try {
        // Verify token here (simplified for demo)
        onlineUsers.set(socket.id, userId);
        
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);

        // Update user status to online
        await updateUserStatus(userId, 'online');
        
        // Join user's channels
        const channels = await getUserChannels(userId);
        channels.forEach(channel => {
          socket.join(channel.id);
        });

        // Notify others
        pubClient.publish('user_status', JSON.stringify({
          userId,
          status: 'online',
          timestamp: new Date().toISOString()
        }));

        socket.emit('authenticated', { success: true, userId });
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authenticated', { success: false, error: 'Authentication failed' });
      }
    });

    // Join channel
    socket.on('join_channel', async ({ channelId }) => {
      socket.join(channelId);
      console.log(`Socket ${socket.id} joined channel ${channelId}`);
    });

    // Leave channel
    socket.on('leave_channel', ({ channelId }) => {
      socket.leave(channelId);
      console.log(`Socket ${socket.id} left channel ${channelId}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const userId = onlineUsers.get(socket.id);
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const messageId = uuidv4();
        const message = {
          id: messageId,
          channelId: data.channelId,
          userId,
          content: data.content,
          createdAt: new Date().toISOString()
        };

        // Save to database
        await saveMessage(message);

        // Broadcast to channel
        const messageData = {
          ...message,
          user: await getUserById(userId)
        };

        io.to(data.channelId).emit('new_message', messageData);

        // Publish to Redis for cross-server sync
        pubClient.publish('messages', JSON.stringify({
          ...messageData,
          channelId: data.channelId
        }));
      } catch (error) {
        console.error('Message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing_start', async ({ channelId }) => {
      const userId = onlineUsers.get(socket.id);
      if (!userId) return;

      const user = await getUserById(userId);
      socket.to(channelId).emit('user_typing', {
        userId,
        username: user.username,
        channelId
      });

      pubClient.publish('typing', JSON.stringify({
        userId,
        username: user.username,
        channelId
      }));
    });

    socket.on('typing_stop', ({ channelId }) => {
      const userId = onlineUsers.get(socket.id);
      if (!userId) return;

      socket.to(channelId).emit('user_typing_stop', { userId, channelId });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      const userId = onlineUsers.get(socket.id);
      if (userId) {
        userSockets.get(userId)?.delete(socket.id);
        onlineUsers.delete(socket.id);

        // If no more sockets for this user, set to offline
        if (!userSockets.get(userId)?.size) {
          await updateUserStatus(userId, 'offline');
          
          pubClient.publish('user_status', JSON.stringify({
            userId,
            status: 'offline',
            timestamp: new Date().toISOString()
          }));
        }
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

// Helper functions
async function updateUserStatus(userId, status) {
  const pool = getPool();
  await pool.query(
    'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
    [status, userId]
  );
}

async function getUserChannels(userId) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT DISTINCT c.* 
    FROM channels c
    JOIN server_members sm ON c.server_id = sm.server_id
    WHERE sm.user_id = $1
  `, [userId]);
  return result.rows;
}

async function saveMessage(message) {
  const pool = getPool();
  await pool.query(
    'INSERT INTO messages (id, channel_id, user_id, content, created_at) VALUES ($1, $2, $3, $4, $5)',
    [message.id, message.channelId, message.userId, message.content, message.createdAt]
  );
}

async function getUserById(userId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT id, username, avatar_url, status FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0];
}
