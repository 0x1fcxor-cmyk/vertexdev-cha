import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Pin message
router.post('/:messageId/pin', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user has permission to pin
    const permissionCheck = await pool.query(
      `SELECT c.server_id 
       FROM messages m
       LEFT JOIN channels c ON m.channel_id = c.id
       LEFT JOIN server_members sm ON c.server_id = sm.server_id
       WHERE m.id = $1 AND sm.user_id = $2 AND (sm.role = 'admin' OR sm.role = 'moderator')`,
      [messageId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions to pin message' });
    }

    await pool.query(
      `INSERT INTO pinned_messages (message_id, pinned_by, reason, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (message_id) DO UPDATE SET reason = $3, pinned_by = $2, created_at = CURRENT_TIMESTAMP`,
      [messageId, userId, reason]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// Unpin message
router.delete('/:messageId/pin', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user has permission to unpin
    const permissionCheck = await pool.query(
      `SELECT c.server_id 
       FROM messages m
       LEFT JOIN channels c ON m.channel_id = c.id
       LEFT JOIN server_members sm ON c.server_id = sm.server_id
       WHERE m.id = $1 AND sm.user_id = $2 AND (sm.role = 'admin' OR sm.role = 'moderator')`,
      [messageId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions to unpin message' });
    }

    await pool.query('DELETE FROM pinned_messages WHERE message_id = $1', [messageId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Unpin message error:', error);
    res.status(500).json({ error: 'Failed to unpin message' });
  }
});

// Get pinned messages for channel
router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT pm.*, m.content, m.created_at as message_created_at, u.username as pinned_by_username
       FROM pinned_messages pm
       LEFT JOIN messages m ON pm.message_id = m.id
       LEFT JOIN users u ON pm.pinned_by = u.id
       WHERE m.channel_id = $1
       ORDER BY pm.created_at DESC`,
      [channelId]
    );

    res.json({ pinnedMessages: result.rows });
  } catch (error) {
    console.error('Get pinned messages error:', error);
    res.status(500).json({ error: 'Failed to get pinned messages' });
  }
});

// Bookmark message for user
router.post('/:messageId/bookmark', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { category, note } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `INSERT INTO message_bookmarks (message_id, user_id, category, note, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (message_id, user_id) DO UPDATE SET category = $3, note = $4, created_at = CURRENT_TIMESTAMP`,
      [messageId, userId, category || 'default', note]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Bookmark message error:', error);
    res.status(500).json({ error: 'Failed to bookmark message' });
  }
});

// Remove bookmark
router.delete('/:messageId/bookmark', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      'DELETE FROM message_bookmarks WHERE message_id = $1 AND user_id = $2',
      [messageId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Remove bookmark error:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// Get user's bookmarks
router.get('/bookmarks', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { category } = req.query;
    const pool = getPool();

    let sql = `SELECT mb.*, m.content, m.created_at as message_created_at, c.name as channel_name
               FROM message_bookmarks mb
               LEFT JOIN messages m ON mb.message_id = m.id
               LEFT JOIN channels c ON m.channel_id = c.id
               WHERE mb.user_id = $1`;
    const params = [userId];

    if (category) {
      sql += ' AND mb.category = $2';
      params.push(category);
    }

    sql += ' ORDER BY mb.created_at DESC';

    const result = await pool.query(sql, params);

    res.json({ bookmarks: result.rows });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
});

// Get bookmark categories
router.get('/bookmarks/categories', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT DISTINCT category, COUNT(*) as count 
       FROM message_bookmarks 
       WHERE user_id = $1 
       GROUP BY category`,
      [userId]
    );

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get bookmark categories error:', error);
    res.status(500).json({ error: 'Failed to get bookmark categories' });
  }
});

export default router;
