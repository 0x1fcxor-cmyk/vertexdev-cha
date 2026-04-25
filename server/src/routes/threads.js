import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create thread from message
router.post('/', async (req, res) => {
  try {
    const { channelId, parentMessageId, name } = req.body;
    const userId = req.headers['x-user-id'];

    if (!channelId || !parentMessageId) {
      return res.status(400).json({ error: 'Channel ID and parent message ID are required' });
    }

    const pool = getPool();
    const threadId = uuidv4();

    await pool.query(
      `INSERT INTO threads (id, channel_id, parent_message_id, name, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [threadId, channelId, parentMessageId, name || null]
    );

    const result = await pool.query(
      'SELECT * FROM threads WHERE id = $1',
      [threadId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// Get threads for a channel
router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { includeArchived = false } = req.query;
    const pool = getPool();

    let sql = `
      SELECT t.*, m.content as parent_content, u.username as parent_author
      FROM threads t
      LEFT JOIN messages m ON t.parent_message_id = m.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE t.channel_id = $1
    `;
    const params = [channelId];

    if (!includeArchived) {
      sql += ' AND t.archived = FALSE';
    }

    sql += ' ORDER BY t.created_at DESC';

    const result = await pool.query(sql, params);

    res.json({ threads: result.rows });
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json({ error: 'Failed to get threads' });
  }
});

// Get thread messages
router.get('/:threadId/messages', async (req, res) => {
  try {
    const { threadId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const pool = getPool();

    const threadResult = await pool.query(
      'SELECT * FROM threads WHERE id = $1',
      [threadId]
    );

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const thread = threadResult.rows[0];

    const messagesResult = await pool.query(
      `SELECT m.*, u.username, u.avatar_url
       FROM messages m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.channel_id = $1 AND m.created_at >= $2
       ORDER BY m.created_at ASC
       LIMIT $3 OFFSET $4`,
      [thread.channel_id, thread.created_at, parseInt(limit), parseInt(offset)]
    );

    res.json({ 
      thread,
      messages: messagesResult.rows 
    });
  } catch (error) {
    console.error('Get thread messages error:', error);
    res.status(500).json({ error: 'Failed to get thread messages' });
  }
});

// Update thread
router.put('/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const { name, archived, autoArchiveDuration } = req.body;
    const pool = getPool();

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (archived !== undefined) {
      updates.push(`archived = $${paramIndex++}`);
      params.push(archived);
    }
    if (autoArchiveDuration !== undefined) {
      updates.push(`auto_archive_duration = $${paramIndex++}`);
      params.push(autoArchiveDuration);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(threadId);

    await pool.query(
      `UPDATE threads SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM threads WHERE id = $1',
      [threadId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update thread error:', error);
    res.status(500).json({ error: 'Failed to update thread' });
  }
});

// Delete thread
router.delete('/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const pool = getPool();

    await pool.query('DELETE FROM threads WHERE id = $1', [threadId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete thread error:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

// Add message to thread
router.post('/:threadId/messages', async (req, res) => {
  try {
    const { threadId } = req.params;
    const { content } = req.body;
    const userId = req.headers['x-user-id'];

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const pool = getPool();

    const threadResult = await pool.query(
      'SELECT * FROM threads WHERE id = $1',
      [threadId]
    );

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const thread = threadResult.rows[0];

    // Add message
    const messageId = uuidv4();
    await pool.query(
      `INSERT INTO messages (id, channel_id, user_id, content, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [messageId, thread.channel_id, userId, content]
    );

    // Update message count
    await pool.query(
      'UPDATE threads SET message_count = message_count + 1 WHERE id = $1',
      [threadId]
    );

    const messageResult = await pool.query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );

    res.status(201).json(messageResult.rows[0]);
  } catch (error) {
    console.error('Add thread message error:', error);
    res.status(500).json({ error: 'Failed to add message to thread' });
  }
});

// Archive thread
router.post('/:threadId/archive', async (req, res) => {
  try {
    const { threadId } = req.params;
    const pool = getPool();

    await pool.query(
      'UPDATE threads SET archived = TRUE WHERE id = $1',
      [threadId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Archive thread error:', error);
    res.status(500).json({ error: 'Failed to archive thread' });
  }
});

// Unarchive thread
router.post('/:threadId/unarchive', async (req, res) => {
  try {
    const { threadId } = req.params;
    const pool = getPool();

    await pool.query(
      'UPDATE threads SET archived = FALSE WHERE id = $1',
      [threadId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Unarchive thread error:', error);
    res.status(500).json({ error: 'Failed to unarchive thread' });
  }
});

export default router;
