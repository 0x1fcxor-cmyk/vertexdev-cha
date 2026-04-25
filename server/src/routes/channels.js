import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get user's servers and channels
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pool = getPool();

    // Get user's servers
    const serversResult = await pool.query(`
      SELECT s.*, sm.role 
      FROM servers s
      JOIN server_members sm ON s.id = sm.server_id
      WHERE sm.user_id = $1
    `, [userId]);

    const servers = serversResult.rows;

    // Get channels for each server
    for (const server of servers) {
      const channelsResult = await pool.query(
        'SELECT * FROM channels WHERE server_id = $1 ORDER BY position',
        [server.id]
      );
      server.channels = channelsResult.rows;
    }

    res.json({ servers });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get channel messages
router.get('/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const pool = getPool();

    const result = await pool.query(`
      SELECT m.*, u.username, u.avatar_url 
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [channelId, limit, offset]);

    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create channel
router.post('/', async (req, res) => {
  try {
    const { serverId, name, type } = req.body;
    const userId = req.headers['x-user-id'];

    if (!serverId || !name) {
      return res.status(400).json({ error: 'Server ID and name are required' });
    }

    const pool = getPool();

    // Check if user is admin/owner
    const memberCheck = await pool.query(
      'SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );

    if (memberCheck.rows.length === 0 || 
        !['owner', 'admin', 'moderator'].includes(memberCheck.rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get next position
    const positionResult = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM channels WHERE server_id = $1',
      [serverId]
    );

    const result = await pool.query(
      'INSERT INTO channels (server_id, name, type, position) VALUES ($1, $2, $3, $4) RETURNING *',
      [serverId, name, type || 'text', positionResult.rows[0].next_pos]
    );

    res.status(201).json({ channel: result.rows[0] });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

export default router;
