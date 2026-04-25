import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Upload video message
router.post('/', async (req, res) => {
  try {
    const { channelId, videoUrl, thumbnailUrl, duration, caption } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const videoId = uuidv4();

    await pool.query(
      `INSERT INTO video_messages (id, channel_id, user_id, video_url, thumbnail_url, duration, caption, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [videoId, channelId, userId, videoUrl, thumbnailUrl, duration, caption]
    );

    const result = await pool.query(
      'SELECT * FROM video_messages WHERE id = $1',
      [videoId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Upload video message error:', error);
    res.status(500).json({ error: 'Failed to upload video message' });
  }
});

// Get video messages for channel
router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 20 } = req.query;
    const pool = getPool();

    const result = await pool.query(
      `SELECT vm.*, u.username, u.avatar_url
       FROM video_messages vm
       LEFT JOIN users u ON vm.user_id = u.id
       WHERE vm.channel_id = $1
       ORDER BY vm.created_at DESC
       LIMIT $2`,
      [channelId, parseInt(limit)]
    );

    res.json({ videoMessages: result.rows });
  } catch (error) {
    console.error('Get video messages error:', error);
    res.status(500).json({ error: 'Failed to get video messages' });
  }
});

// Get video message details
router.get('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT vm.*, u.username, u.avatar_url
       FROM video_messages vm
       LEFT JOIN users u ON vm.user_id = u.id
       WHERE vm.id = $1`,
      [videoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video message not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get video message error:', error);
    res.status(500).json({ error: 'Failed to get video message' });
  }
});

// Delete video message
router.delete('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership or admin/mod
    const video = await pool.query(
      'SELECT * FROM video_messages WHERE id = $1',
      [videoId]
    );

    if (video.rows.length === 0) {
      return res.status(404).json({ error: 'Video message not found' });
    }

    if (video.rows[0].user_id !== userId) {
      // Check if user is admin/mod in server
      const permissionCheck = await pool.query(
        `SELECT * FROM server_members sm
         LEFT JOIN channels c ON sm.server_id = c.server_id
         WHERE c.id = $1 AND sm.user_id = $2 AND (sm.role = 'admin' OR sm.role = 'moderator')`,
        [video.rows[0].channel_id, userId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to delete this video' });
      }
    }

    await pool.query('DELETE FROM video_messages WHERE id = $1', [videoId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete video message error:', error);
    res.status(500).json({ error: 'Failed to delete video message' });
  }
});

// Add reaction to video
router.post('/:videoId/reactions', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { emoji } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `INSERT INTO video_reactions (video_id, user_id, emoji, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (video_id, user_id) DO UPDATE SET emoji = $3, created_at = CURRENT_TIMESTAMP`,
      [videoId, userId, emoji]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Get video reactions
router.get('/:videoId/reactions', async (req, res) => {
  try {
    const { videoId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT vr.*, u.username
       FROM video_reactions vr
       LEFT JOIN users u ON vr.user_id = u.id
       WHERE vr.video_id = $1`,
      [videoId]
    );

    res.json({ reactions: result.rows });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ error: 'Failed to get reactions' });
  }
});

export default router;
