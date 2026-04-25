import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get custom emojis for a server
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM custom_emojis WHERE server_id = $1 ORDER BY name',
      [serverId]
    );

    res.json({ emojis: result.rows });
  } catch (error) {
    console.error('Get emojis error:', error);
    res.status(500).json({ error: 'Failed to get emojis' });
  }
});

// Create custom emoji
router.post('/', async (req, res) => {
  try {
    const { serverId, name, imageUrl, animated } = req.body;
    const userId = req.headers['x-user-id'];

    if (!name || !imageUrl) {
      return res.status(400).json({ error: 'Name and image URL are required' });
    }

    const pool = getPool();

    // Check if emoji name already exists in server
    const existing = await pool.query(
      'SELECT * FROM custom_emojis WHERE server_id = $1 AND name = $2',
      [serverId, name]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Emoji name already exists' });
    }

    const emojiId = uuidv4();
    await pool.query(
      `INSERT INTO custom_emojis (id, server_id, name, image_url, animated, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [emojiId, serverId, name, imageUrl, animated || false]
    );

    const result = await pool.query(
      'SELECT * FROM custom_emojis WHERE id = $1',
      [emojiId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create emoji error:', error);
    res.status(500).json({ error: 'Failed to create emoji' });
  }
});

// Delete custom emoji
router.delete('/:emojiId', async (req, res) => {
  try {
    const { emojiId } = req.params;
    const pool = getPool();

    await pool.query('DELETE FROM custom_emojis WHERE id = $1', [emojiId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete emoji error:', error);
    res.status(500).json({ error: 'Failed to delete emoji' });
  }
});

// Use emoji
router.post('/:emojiId/use', async (req, res) => {
  try {
    const { emojiId } = req.params;
    const { messageId } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `INSERT INTO emoji_usage (id, emoji_id, user_id, message_id, used_at)
       VALUES (gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP)`,
      [emojiId, userId, messageId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Use emoji error:', error);
    res.status(500).json({ error: 'Failed to use emoji' });
  }
});

// Get emoji statistics
router.get('/:emojiId/stats', async (req, res) => {
  try {
    const { emojiId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT COUNT(*) as uses, COUNT(DISTINCT user_id) as unique_users
       FROM emoji_usage WHERE emoji_id = $1`,
      [emojiId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get emoji stats error:', error);
    res.status(500).json({ error: 'Failed to get emoji statistics' });
  }
});

export default router;
