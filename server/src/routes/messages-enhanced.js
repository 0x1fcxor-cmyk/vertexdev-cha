import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';
import { hasPermission, Permissions } from '../utils/permissions.js';
import { processMessageContent } from '../utils/markdown.js';

const router = express.Router();

// Edit message
router.put('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.headers['x-user-id'];

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const pool = getPool();

    // Get the message
    const messageResult = await pool.query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageResult.rows[0];

    // Check if user owns the message
    if (message.user_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    // Check if message is too old (15 minute limit)
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    if (messageAge > 15 * 60 * 1000) {
      return res.status(403).json({ error: 'Message is too old to edit' });
    }

    // Update message
    const processedContent = processMessageContent(content);
    await pool.query(
      `UPDATE messages 
       SET content = $1, edited = TRUE, edited_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [content, messageId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete message
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.headers['x-user-id'];

    const pool = getPool();

    // Get the message
    const messageResult = await pool.query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageResult.rows[0];

    // Check if user owns the message or has permission
    if (message.user_id !== userId) {
      // TODO: Check if user has MANAGE_MESSAGES permission
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Delete message
    await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Add reaction
router.post('/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.headers['x-user-id'];

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const pool = getPool();

    // Get message
    const messageResult = await pool.query(
      'SELECT reactions FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const reactions = messageResult.rows[0].reactions || {};

    // Add user to reaction
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }
    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId);
    }

    // Update message
    await pool.query(
      'UPDATE messages SET reactions = $1 WHERE id = $2',
      [JSON.stringify(reactions), messageId]
    );

    res.json({ reactions });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Remove reaction
router.delete('/:messageId/reactions/:emoji', async (req, res) => {
  try {
    const { messageId, emoji } = req.params;
    const userId = req.headers['x-user-id'];

    const pool = getPool();

    // Get message
    const messageResult = await pool.query(
      'SELECT reactions FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const reactions = messageResult.rows[0].reactions || {};

    // Remove user from reaction
    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter(id => id !== userId);
      
      // Remove emoji if no users
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    // Update message
    await pool.query(
      'UPDATE messages SET reactions = $1 WHERE id = $2',
      [JSON.stringify(reactions), messageId]
    );

    res.json({ reactions });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// Pin message
router.put('/:messageId/pin', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { pinned } = req.body;
    const userId = req.headers['x-user-id'];

    const pool = getPool();

    // Get message and channel
    const messageResult = await pool.query(
      'SELECT m.*, c.server_id FROM messages m JOIN channels c ON m.channel_id = c.id WHERE m.id = $1',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageResult.rows[0];
    const serverId = message.server_id;

    // Check if user has permission to pin
    // TODO: Implement proper permission check
    if (message.user_id !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update message
    await pool.query(
      'UPDATE messages SET pinned = $1 WHERE id = $2',
      [pinned, messageId]
    );

    res.json({ success: true, pinned });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// Search messages
router.get('/search', async (req, res) => {
  try {
    const { query, channelId, limit = 50 } = req.query;

    if (!query || query.length < 3) {
      return res.status(400).json({ error: 'Query must be at least 3 characters' });
    }

    const pool = getPool();

    let sql = `
      SELECT m.*, u.username, u.avatar_url, c.name as channel_name
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN channels c ON m.channel_id = c.id
      WHERE to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
    `;
    const params = [query];

    if (channelId) {
      sql += ' AND m.channel_id = $2';
      params.push(channelId);
    }

    sql += ' ORDER BY m.created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const result = await pool.query(sql, params);

    res.json({ messages: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// Mark message as read
router.post('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.headers['x-user-id'];

    const pool = getPool();

    // Check if already read
    const existingRead = await pool.query(
      'SELECT * FROM message_reads WHERE message_id = $1 AND user_id = $2',
      [messageId, userId]
    );

    if (existingRead.rows.length === 0) {
      await pool.query(
        'INSERT INTO message_reads (message_id, user_id, read_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [messageId, userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

export default router;
