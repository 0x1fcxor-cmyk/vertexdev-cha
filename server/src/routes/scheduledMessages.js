import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create scheduled message
router.post('/', async (req, res) => {
  try {
    const { channelId, content, scheduledFor, timezone } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const messageId = uuidv4();

    await pool.query(
      `INSERT INTO scheduled_messages (id, user_id, channel_id, content, scheduled_for, timezone, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_TIMESTAMP)`,
      [messageId, userId, channelId, content, scheduledFor, timezone]
    );

    const result = await pool.query(
      'SELECT * FROM scheduled_messages WHERE id = $1',
      [messageId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create scheduled message error:', error);
    res.status(500).json({ error: 'Failed to create scheduled message' });
  }
});

// Get scheduled messages for user
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { status } = req.query;
    const pool = getPool();

    let sql = 'SELECT sm.*, c.name as channel_name FROM scheduled_messages sm LEFT JOIN channels c ON sm.channel_id = c.id WHERE sm.user_id = $1';
    const params = [userId];

    if (status) {
      sql += ' AND sm.status = $2';
      params.push(status);
    }

    sql += ' ORDER BY sm.scheduled_for ASC';

    const result = await pool.query(sql, params);

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get scheduled messages error:', error);
    res.status(500).json({ error: 'Failed to get scheduled messages' });
  }
});

// Get scheduled messages for channel (mod/admin only)
router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT c.server_id 
       FROM channels c
       LEFT JOIN server_members sm ON c.server_id = sm.server_id
       WHERE c.id = $1 AND sm.user_id = $2 AND (sm.role = 'admin' OR sm.role = 'moderator')`,
      [channelId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await pool.query(
      `SELECT sm.*, u.username 
       FROM scheduled_messages sm
       LEFT JOIN users u ON sm.user_id = u.id
       WHERE sm.channel_id = $1
       ORDER BY sm.scheduled_for ASC`,
      [channelId]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get channel scheduled messages error:', error);
    res.status(500).json({ error: 'Failed to get scheduled messages' });
  }
});

// Update scheduled message
router.put('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, scheduledFor, timezone } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const ownershipCheck = await pool.query(
      'SELECT * FROM scheduled_messages WHERE id = $1 AND user_id = $2',
      [messageId, userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to update this message' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(content);
    }
    if (scheduledFor !== undefined) {
      updates.push(`scheduled_for = $${paramIndex++}`);
      params.push(scheduledFor);
    }
    if (timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      params.push(timezone);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(messageId);
    params.push(userId);

    await pool.query(
      `UPDATE scheduled_messages SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM scheduled_messages WHERE id = $1',
      [messageId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update scheduled message error:', error);
    res.status(500).json({ error: 'Failed to update scheduled message' });
  }
});

// Cancel scheduled message
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const ownershipCheck = await pool.query(
      'SELECT * FROM scheduled_messages WHERE id = $1 AND user_id = $2',
      [messageId, userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to cancel this message' });
    }

    await pool.query(
      'UPDATE scheduled_messages SET status = $1, cancelled_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', messageId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Cancel scheduled message error:', error);
    res.status(500).json({ error: 'Failed to cancel scheduled message' });
  }
});

// Send scheduled message now
router.post('/:messageId/send', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const scheduledMessage = await pool.query(
      'SELECT * FROM scheduled_messages WHERE id = $1 AND user_id = $2',
      [messageId, userId]
    );

    if (scheduledMessage.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to send this message' });
    }

    const message = scheduledMessage.rows[0];

    // Create the actual message
    await pool.query(
      `INSERT INTO messages (id, channel_id, user_id, content, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [uuidv4(), message.channel_id, userId, message.content]
    );

    // Update scheduled message status
    await pool.query(
      'UPDATE scheduled_messages SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['sent', messageId]
    );

    // Emit via Socket.io
    const io = req.app.get('io');
    io.to(`channel:${message.channel_id}`).emit('message:create', {
      channelId: message.channel_id,
      content: message.content,
      userId
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Send scheduled message error:', error);
    res.status(500).json({ error: 'Failed to send scheduled message' });
  }
});

export default router;
