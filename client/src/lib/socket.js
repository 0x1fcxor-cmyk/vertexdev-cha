import RobustSocketClient from './websocket/RobustSocketClient.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Create robust socket client instance
const robustClient = new RobustSocketClient({
  url: SOCKET_URL,
  enableQueue: true,
  queuePersistence: true,
  enableHeartbeat: true,
  heartbeatInterval: 30000,
  heartbeatTimeout: 60000,
  enableCompression: true
});

// Legacy SocketClient wrapper for backward compatibility
class SocketClient {
  constructor() {
    this.robustClient = robustClient;
    this.connected = false;

    // Forward events from robust client
    this.robustClient.on('connected', () => {
      this.connected = true;
      console.log('Connected to server (robust)');
    });

    this.robustClient.on('disconnected', () => {
      this.connected = false;
      console.log('Disconnected from server (robust)');
    });

    this.robustClient.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  connect() {
    this.robustClient.connect();
    return this.robustClient.socket;
  }

  authenticate(userId, token) {
    return this.robustClient.authenticate(userId, token);
  }

  joinChannel(channelId) {
    this.robustClient.joinChannel(channelId);
  }

  leaveChannel(channelId) {
    this.robustClient.leaveChannel(channelId);
  }

  sendMessage(channelId, content) {
    return this.robustClient.sendMessage(channelId, content);
  }

  startTyping(channelId) {
    this.robustClient.startTyping(channelId);
  }

  stopTyping(channelId) {
    this.robustClient.stopTyping(channelId);
  }

  on(event, callback) {
    this.robustClient.on(event, callback);
  }

  off(event, callback) {
    this.robustClient.off(event, callback);
  }

  disconnect() {
    this.robustClient.disconnect();
    this.connected = false;
  }

  // New methods from robust client
  getStats() {
    return this.robustClient.getStats();
  }

  getHealth() {
    return this.robustClient.getHealth();
  }
}

export const socketClient = new SocketClient();
export { robustClient };
