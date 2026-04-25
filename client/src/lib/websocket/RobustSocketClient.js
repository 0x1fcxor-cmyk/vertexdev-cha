import { io } from 'socket.io-client';

/**
 * Simple EventEmitter for browser compatibility
 */
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, ...args) {
    if (!this.events[event]) return false;
    this.events[event].forEach(listener => listener(...args));
    return true;
  }
}

/**
 * Production-grade WebSocket client with:
 * - Exponential backoff reconnection
 * - Message queue with offline support
 * - Heartbeat/ping-pong
 * - Event system
 * - State management
 * - Retry logic
 * - Compression
 */
class RobustSocketClient extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      url: options.url || import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      pingTimeout: 60000,
      pingInterval: 25000,
      enableQueue: true,
      queueMaxSize: 1000,
      queuePersistence: false,
      enableCompression: true,
      enableHeartbeat: true,
      heartbeatInterval: 30000,
      heartbeatTimeout: 60000,
      ...options
    };

    this.socket = null;
    this.connected = false;
    this.authenticated = false;
    this.userId = null;
    this.token = null;
    
    // Connection state
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, reconnecting
    this.reconnectionAttempts = 0;
    this.lastConnectionTime = null;
    
    // Message queue
    this.messageQueue = [];
    this.queuedMessages = new Map(); // messageId -> { data, retries, timestamp }
    this.maxRetries = 3;
    
    // Heartbeat
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.lastHeartbeat = null;
    
    // Event handlers
    this.eventHandlers = new Map();
    
    // Statistics
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesQueued: 0,
      messagesFailed: 0,
      reconnections: 0,
      connectionTime: 0,
      disconnects: 0
    };

    this.init();
  }

  init() {
    if (this.options.enableQueue && this.options.queuePersistence) {
      this.loadQueueFromStorage();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return this.socket;
    }

    this.connectionState = 'connecting';
    this.emit('connecting');

    this.socket = io(this.options.url, {
      transports: this.options.transports,
      reconnection: this.options.reconnection,
      reconnectionDelay: this.options.reconnectionDelay,
      reconnectionDelayMax: this.options.reconnectionDelayMax,
      reconnectionAttempts: this.options.reconnectionAttempts,
      timeout: this.options.timeout,
      pingTimeout: this.options.pingTimeout,
      pingInterval: this.options.pingInterval,
      compression: this.options.enableCompression
    });

    this.setupSocketHandlers();
    return this.socket;
  }

  /**
   * Setup socket event handlers
   */
  setupSocketHandlers() {
    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('disconnect', (reason) => this.handleDisconnect(reason));
    this.socket.on('error', (error) => this.handleError(error));
    this.socket.on('connect_error', (error) => this.handleConnectError(error));
    this.socket.on('reconnect', (attemptNumber) => this.handleReconnect(attemptNumber));
    this.socket.on('reconnect_attempt', (attemptNumber) => this.handleReconnectAttempt(attemptNumber));
    this.socket.on('reconnect_error', (error) => this.handleReconnectError(error));
    this.socket.on('reconnect_failed', () => this.handleReconnectFailed());
    this.socket.on('ping', () => this.handlePing());
    this.socket.on('pong', (latency) => this.handlePong(latency));
  }

  /**
   * Handle successful connection
   */
  handleConnect() {
    this.connected = true;
    this.connectionState = 'connected';
    this.reconnectionAttempts = 0;
    this.lastConnectionTime = Date.now();
    
    this.emit('connected');
    this.emit('state_change', { state: 'connected' });

    // Start heartbeat
    if (this.options.enableHeartbeat) {
      this.startHeartbeat();
    }

    // Send queued messages
    if (this.authenticated) {
      this.processQueue();
    }

    // Re-join channels if authenticated
    if (this.authenticated && this.userId) {
      this.restoreState();
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnect(reason) {
    this.connected = false;
    this.authenticated = false;
    this.connectionState = 'disconnected';
    this.stats.disconnects++;

    this.emit('disconnected', { reason });
    this.emit('state_change', { state: 'disconnected', reason });

    // Stop heartbeat
    this.stopHeartbeat();

    // Queue messages if enabled
    if (this.options.enableQueue && reason !== 'io client disconnect') {
      this.enableQueueMode();
    }
  }

  /**
   * Handle socket error
   */
  handleError(error) {
    this.emit('error', error);
    console.error('WebSocket error:', error);
  }

  /**
   * Handle connection error
   */
  handleConnectError(error) {
    this.connectionState = 'disconnected';
    this.emit('connect_error', error);
    console.error('Connection error:', error);
  }

  /**
   * Handle reconnection
   */
  handleReconnect(attemptNumber) {
    this.connected = true;
    this.connectionState = 'connected';
    this.reconnectionAttempts = 0;
    this.stats.reconnections++;

    this.emit('reconnected', { attemptNumber });
    this.emit('state_change', { state: 'reconnected', attemptNumber });

    if (this.options.enableHeartbeat) {
      this.startHeartbeat();
    }

    if (this.authenticated) {
      this.processQueue();
      this.restoreState();
    }
  }

  /**
   * Handle reconnection attempt
   */
  handleReconnectAttempt(attemptNumber) {
    this.connectionState = 'reconnecting';
    this.reconnectionAttempts = attemptNumber;
    
    this.emit('reconnecting', { attemptNumber });
    this.emit('state_change', { state: 'reconnecting', attemptNumber });
  }

  /**
   * Handle reconnection error
   */
  handleReconnectError(error) {
    this.emit('reconnect_error', error);
    console.error('Reconnection error:', error);
  }

  /**
   * Handle reconnection failed
   */
  handleReconnectFailed() {
    this.connectionState = 'disconnected';
    this.emit('reconnect_failed');
    this.emit('state_change', { state: 'reconnect_failed' });
  }

  /**
   * Handle ping from server
   */
  handlePing() {
    this.lastHeartbeat = Date.now();
  }

  /**
   * Handle pong from server
   */
  handlePong(latency) {
    this.lastHeartbeat = Date.now();
    this.emit('pong', { latency });
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.socket.emit('heartbeat');
        this.lastHeartbeat = Date.now();
        
        // Check for timeout
        this.heartbeatTimeout = setTimeout(() => {
          if (Date.now() - this.lastHeartbeat > this.options.heartbeatTimeout) {
            console.warn('Heartbeat timeout, forcing reconnection');
            this.socket.disconnect();
          }
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Authenticate with server
   */
  authenticate(userId, token) {
    this.userId = userId;
    this.token = token;

    if (!this.socket) {
      this.connect();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 10000);

      const handleAuth = (response) => {
        clearTimeout(timeout);
        this.socket.off('authenticated', handleAuth);
        this.socket.off('authenticated_error', handleError);

        if (response.success) {
          this.authenticated = true;
          this.emit('authenticated', response);
          resolve(response);
        } else {
          this.authenticated = false;
          reject(new Error(response.error || 'Authentication failed'));
        }
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket.off('authenticated', handleAuth);
        this.socket.off('authenticated_error', handleError);
        this.authenticated = false;
        reject(error);
      };

      this.socket.on('authenticated', handleAuth);
      this.socket.on('authenticated_error', handleError);
      this.socket.emit('authenticate', { userId, token });
    });
  }

  /**
   * Restore state after reconnection
   */
  async restoreState() {
    try {
      // Re-join channels
      const channels = this.joinedChannels || [];
      channels.forEach(channelId => {
        this.socket.emit('join_channel', { channelId });
      });

      this.emit('state_restored');
    } catch (error) {
      console.error('Error restoring state:', error);
    }
  }

  /**
   * Join a channel
   */
  joinChannel(channelId) {
    if (!this.joinedChannels) {
      this.joinedChannels = new Set();
    }
    this.joinedChannels.add(channelId);

    if (this.connected) {
      this.socket.emit('join_channel', { channelId });
    }
  }

  /**
   * Leave a channel
   */
  leaveChannel(channelId) {
    if (this.joinedChannels) {
      this.joinedChannels.delete(channelId);
    }

    if (this.connected) {
      this.socket.emit('leave_channel', { channelId });
    }
  }

  /**
   * Send message with acknowledgment and retry
   */
  sendMessage(channelId, content, options = {}) {
    const messageId = this.generateMessageId();
    const message = {
      id: messageId,
      channelId,
      content,
      timestamp: Date.now(),
      ...options
    };

    return new Promise((resolve, reject) => {
      if (!this.connected || !this.authenticated) {
        if (this.options.enableQueue) {
          this.queueMessage(message);
          resolve({ queued: true, messageId });
          return;
        } else {
          reject(new Error('Not connected or authenticated'));
          return;
        }
      }

      const timeout = setTimeout(() => {
        this.handleMessageFailure(message, reject);
      }, options.timeout || 10000);

      const handleAck = (ack) => {
        clearTimeout(timeout);
        this.socket.off(`message_ack_${messageId}`, handleAck);
        this.socket.off(`message_error_${messageId}`, handleError);
        
        this.stats.messagesSent++;
        this.queuedMessages.delete(messageId);
        
        if (ack.success) {
          resolve(ack);
        } else {
          reject(new Error(ack.error || 'Message failed'));
        }
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket.off(`message_ack_${messageId}`, handleAck);
        this.socket.off(`message_error_${messageId}`, handleError);
        
        this.handleMessageFailure(message, reject);
      };

      this.socket.on(`message_ack_${messageId}`, handleAck);
      this.socket.on(`message_error_${messageId}`, handleError);
      this.socket.emit('send_message', message);
    });
  }

  /**
   * Handle message failure with retry
   */
  handleMessageFailure(message, reject) {
    const queued = this.queuedMessages.get(message.id);
    
    if (!queued) {
      queued = {
        data: message,
        retries: 0,
        timestamp: Date.now()
      };
      this.queuedMessages.set(message.id, queued);
    }

    queued.retries++;

    if (queued.retries < this.maxRetries) {
      // Retry after delay
      setTimeout(() => {
        if (this.connected && this.authenticated) {
          this.socket.emit('send_message', message);
        } else if (this.options.enableQueue) {
          this.queueMessage(message);
        }
      }, this.getRetryDelay(queued.retries));
    } else {
      // Max retries reached
      this.stats.messagesFailed++;
      this.queuedMessages.delete(message.id);
      reject(new Error('Message failed after max retries'));
    }
  }

  /**
   * Get retry delay with exponential backoff
   */
  getRetryDelay(retryCount) {
    return Math.min(1000 * Math.pow(2, retryCount), 10000);
  }

  /**
   * Queue message for later sending
   */
  queueMessage(message) {
    if (this.messageQueue.length >= this.options.queueMaxSize) {
      this.messageQueue.shift(); // Remove oldest
    }

    this.messageQueue.push(message);
    this.stats.messagesQueued++;

    if (this.options.queuePersistence) {
      this.saveQueueToStorage();
    }
  }

  /**
   * Process queued messages
   */
  async processQueue() {
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of queue) {
      try {
        await this.sendMessage(message.channelId, message.content, {
          timeout: 5000,
          ...message.options
        });
      } catch (error) {
        console.error('Failed to send queued message:', error);
        this.queueMessage(message);
      }
    }
  }

  /**
   * Enable queue mode
   */
  enableQueueMode() {
    this.emit('queue_mode_enabled');
  }

  /**
   * Save queue to localStorage
   */
  saveQueueToStorage() {
    try {
      localStorage.setItem('websocket_queue', JSON.stringify(this.messageQueue));
    } catch (error) {
      console.error('Failed to save queue to storage:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  loadQueueFromStorage() {
    try {
      const saved = localStorage.getItem('websocket_queue');
      if (saved) {
        this.messageQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
    }
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start typing indicator
   */
  startTyping(channelId) {
    if (this.connected) {
      this.socket.emit('typing_start', { channelId });
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping(channelId) {
    if (this.connected) {
      this.socket.emit('typing_stop', { channelId });
    }
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (this.socket) {
      this.socket.on(event, handler);
    }
    this.eventHandlers.set(event, handler);
    return this;
  }

  /**
   * Remove event handler
   */
  off(event, handler) {
    if (this.socket) {
      this.socket.off(event, handler);
    }
    this.eventHandlers.delete(event);
    return this;
  }

  /**
   * Emit event to server
   */
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else if (this.options.enableQueue && event !== 'authenticate') {
      this.queueMessage({ event, data });
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
    }

    this.connected = false;
    this.authenticated = false;
    this.connectionState = 'disconnected';

    if (this.options.queuePersistence) {
      this.saveQueueToStorage();
    }

    this.emit('disconnected', { reason: 'manual' });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      ...this.stats,
      connected: this.connected,
      authenticated: this.authenticated,
      connectionState: this.connectionState,
      reconnectionAttempts: this.reconnectionAttempts,
      queueSize: this.messageQueue.length,
      connectionTime: this.lastConnectionTime ? Date.now() - this.lastConnectionTime : 0
    };
  }

  /**
   * Get connection health
   */
  getHealth() {
    const now = Date.now();
    const timeSinceLastHeartbeat = this.lastHeartbeat ? now - this.lastHeartbeat : Infinity;
    
    return {
      healthy: this.connected && 
               this.authenticated && 
               timeSinceLastHeartbeat < this.options.heartbeatTimeout,
      connected: this.connected,
      authenticated: this.authenticated,
      lastHeartbeat: this.lastHeartbeat,
      timeSinceLastHeartbeat,
      latency: this.socket?.io?.engine?.transport?.websocket?.latency || 0
    };
  }
}

export default RobustSocketClient;
