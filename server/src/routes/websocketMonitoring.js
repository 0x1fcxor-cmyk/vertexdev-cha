import express from 'express';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

/**
 * WebSocket monitoring routes
 * Provides API endpoints for monitoring WebSocket server health and metrics
 */

// Get dashboard data
router.get('/dashboard', (req, res) => {
  try {
    if (!global.robustSocketHandlers) {
      return res.status(503).json({ error: 'WebSocket handlers not initialized' });
    }

    const handlers = global.robustSocketHandlers;
    const stats = handlers.getStats();

    res.json({
      stats,
      onlineUsers: handlers.getOnlineUsers(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get detailed statistics
router.get('/stats', (req, res) => {
  try {
    if (!global.robustSocketHandlers) {
      return res.status(503).json({ error: 'WebSocket handlers not initialized' });
    }

    const handlers = global.robustSocketHandlers;
    const stats = handlers.getStats();

    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get online users
router.get('/online-users', (req, res) => {
  try {
    if (!global.robustSocketHandlers) {
      return res.status(503).json({ error: 'WebSocket handlers not initialized' });
    }

    const handlers = global.robustSocketHandlers;
    const onlineUsers = handlers.getOnlineUsers();

    res.json({
      count: onlineUsers.length,
      users: onlineUsers
    });
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

// Get users in specific room
router.get('/room/:roomId/users', (req, res) => {
  try {
    if (!global.robustSocketHandlers) {
      return res.status(503).json({ error: 'WebSocket handlers not initialized' });
    }

    const handlers = global.robustSocketHandlers;
    const users = handlers.getUsersInRoom(req.params.roomId);

    res.json({
      roomId: req.params.roomId,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error getting room users:', error);
    res.status(500).json({ error: 'Failed to get room users' });
  }
});

// Broadcast message to all users
router.post('/broadcast', rateLimit('admin'), (req, res) => {
  try {
    if (!global.robustSocketHandlers) {
      return res.status(503).json({ error: 'WebSocket handlers not initialized' });
    }

    const { event, data } = req.body;

    if (!event || !data) {
      return res.status(400).json({ error: 'Event and data are required' });
    }

    const handlers = global.robustSocketHandlers;
    handlers.broadcast(event, data);

    res.json({ success: true, message: 'Broadcast sent' });
  } catch (error) {
    console.error('Error broadcasting:', error);
    res.status(500).json({ error: 'Failed to broadcast' });
  }
});

// Send message to specific user
router.post('/send-user', rateLimit('admin'), (req, res) => {
  try {
    if (!global.robustSocketHandlers) {
      return res.status(503).json({ error: 'WebSocket handlers not initialized' });
    }

    const { userId, event, data } = req.body;

    if (!userId || !event || !data) {
      return res.status(400).json({ error: 'UserId, event, and data are required' });
    }

    const handlers = global.robustSocketHandlers;
    handlers.sendToUser(userId, event, data);

    res.json({ success: true, message: 'Message sent to user' });
  } catch (error) {
    console.error('Error sending to user:', error);
    res.status(500).json({ error: 'Failed to send to user' });
  }
});

// Send message to room
router.post('/send-room', rateLimit('admin'), (req, res) => {
  try {
    if (!global.robustSocketHandlers) {
      return res.status(503).json({ error: 'WebSocket handlers not initialized' });
    }

    const { roomId, event, data } = req.body;

    if (!roomId || !event || !data) {
      return res.status(400).json({ error: 'RoomId, event, and data are required' });
    }

    const handlers = global.robustSocketHandlers;
    handlers.broadcastToRoom(roomId, event, data);

    res.json({ success: true, message: 'Message sent to room' });
  } catch (error) {
    console.error('Error sending to room:', error);
    res.status(500).json({ error: 'Failed to send to room' });
  }
});

// Disconnect user
router.post('/disconnect-user', rateLimit('admin'), (req, res) => {
  try {
    if (!global.robustSocketHandlers) {
      return res.status(503).json({ error: 'WebSocket handlers not initialized' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'UserId is required' });
    }

    const handlers = global.robustSocketHandlers;
    handlers.disconnectUser(userId);

    res.json({ success: true, message: 'User disconnected' });
  } catch (error) {
    console.error('Error disconnecting user:', error);
    res.status(500).json({ error: 'Failed to disconnect user' });
  }
});

export default router;
