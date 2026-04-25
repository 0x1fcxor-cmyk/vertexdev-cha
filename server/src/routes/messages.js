import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get online users
router.get('/users/online', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, username, avatar_url, status FROM users WHERE status = $1',
      ['online']
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// Get channel members
router.get('/channels/:channelId/members', async (req, res) => {
  try {
    const { channelId } = req.params;
    const pool = getPool();

    const result = await pool.query(`
      SELECT DISTINCT u.id, u.username, u.avatar_url, u.status, sm.role
      FROM users u
      JOIN server_members sm ON u.id = sm.user_id
      JOIN channels c ON sm.server_id = c.server_id
      WHERE c.id = $1
    `, [channelId]);

    res.json({ members: result.rows });
  } catch (error) {
    console.error('Get channel members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

export default router;
