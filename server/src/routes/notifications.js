import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { unreadOnly = false } = req.query;

    const pool = getPool();

    let sql = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [userId];

    if (unreadOnly === 'true') {
      sql += ' AND read = FALSE';
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    const result = await pool.query(sql, params);

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Create notification
router.post('/', async (req, res) => {
  try {
    const { type, title, body, data } = req.body;
    const userId = req.headers['x-user-id'];

    if (!type) {
      return res.status(400).json({ error: 'Type is required' });
    }

    const pool = getPool();

    const notificationId = uuidv4();
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, body, data, read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, CURRENT_TIMESTAMP)`,
      [notificationId, userId, type, title, body, JSON.stringify(data || {})]
    );

    const result = await pool.query(
      'SELECT * FROM notifications WHERE id = $1',
      [notificationId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.headers['x-user-id'];

    const pool = getPool();

    await pool.query(
      'UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      'UPDATE notifications SET read = TRUE WHERE user_id = $1',
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.headers['x-user-id'];

    const pool = getPool();

    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [userId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
