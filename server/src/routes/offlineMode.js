import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get offline data for user
router.get('/data', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { lastSync } = req.query;
    const pool = getPool();

    // Get user's servers
    const servers = await pool.query(
      `SELECT s.*, sm.role 
       FROM servers s
       LEFT JOIN server_members sm ON s.id = sm.server_id
       WHERE sm.user_id = $1`,
      [userId]
    );

    // Get user's friends
    const friends = await pool.query(
      `SELECT f.*, u.username, u.avatar_url, u.status
       FROM friends f
       LEFT JOIN users u ON (f.user_id_1 = u.id OR f.user_id_2 = u.id)
       WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1) AND f.status = 'accepted'`,
      [userId]
    );

    // Get recent messages (from last sync if provided)
    let messagesSql = 'SELECT m.*, c.name as channel_name FROM messages m LEFT JOIN channels c ON m.channel_id = c.id WHERE m.created_at >= CURRENT_TIMESTAMP - INTERVAL \'7 days\'';
    const messagesParams = [];

    if (lastSync) {
      messagesSql = 'SELECT m.*, c.name as channel_name FROM messages m LEFT JOIN channels c ON m.channel_id = c.id WHERE m.created_at >= $1';
      messagesParams.push(lastSync);
    }

    const messages = await pool.query(messagesSql, messagesParams);

    // Get user's DMs
    const dms = await pool.query(
      `SELECT dm.*, u.username, u.avatar_url
       FROM direct_messages dm
       LEFT JOIN users u ON (dm.sender_id = u.id OR dm.recipient_id = u.id)
       WHERE (dm.sender_id = $1 OR dm.recipient_id = $1)
       ORDER BY dm.created_at DESC
       LIMIT 100`,
      [userId]
    );

    res.json({
      servers: servers.rows,
      friends: friends.rows,
      messages: messages.rows,
      dms: dms.rows,
      syncTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get offline data error:', error);
    res.status(500).json({ error: 'Failed to get offline data' });
  }
});

// Upload offline changes
router.post('/sync', async (req, res) => {
  try {
    const { changes } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Process offline changes
    for (const change of changes) {
      if (change.type === 'message') {
        // Create message that was sent offline
        await pool.query(
          `INSERT INTO messages (id, channel_id, user_id, content, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [change.id, change.channelId, userId, change.content, change.createdAt]
        );
      } else if (change.type === 'dm') {
        // Create DM that was sent offline
        await pool.query(
          `INSERT INTO direct_messages (id, sender_id, recipient_id, content, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [change.id, userId, change.recipientId, change.content, change.createdAt]
        );
      } else if (change.type === 'reaction') {
        // Add reaction that was added offline
        await pool.query(
          `INSERT INTO reactions (message_id, user_id, emoji, created_at)
           VALUES ($1, $2, $3, $4)`,
          [change.messageId, userId, change.emoji, change.createdAt]
        );
      }
    }

    res.json({ success: true, syncedChanges: changes.length });
  } catch (error) {
    console.error('Sync offline changes error:', error);
    res.status(500).json({ error: 'Failed to sync offline changes' });
  }
});

// Get offline preferences
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM offline_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        enabled: false,
        autoDownload: false,
        maxStorage: 100, // MB
        syncInterval: 3600 // seconds
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get offline preferences error:', error);
    res.status(500).json({ error: 'Failed to get offline preferences' });
  }
});

// Update offline preferences
router.put('/preferences', async (req, res) => {
  try {
    const { enabled, autoDownload, maxStorage, syncInterval } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `INSERT INTO offline_preferences (user_id, enabled, auto_download, max_storage, sync_interval, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET enabled = $2, auto_download = $3, max_storage = $4, sync_interval = $5, updated_at = CURRENT_TIMESTAMP`,
      [userId, enabled || false, autoDownload || false, maxStorage || 100, syncInterval || 3600]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update offline preferences error:', error);
    res.status(500).json({ error: 'Failed to update offline preferences' });
  }
});

// Clear offline data
router.delete('/data', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // In a real implementation, this would clear cached offline data
    // For now, we'll just update the last cleared timestamp

    await pool.query(
      `INSERT INTO offline_preferences (user_id, last_cleared, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET last_cleared = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Clear offline data error:', error);
    res.status(500).json({ error: 'Failed to clear offline data' });
  }
});

export default router;
