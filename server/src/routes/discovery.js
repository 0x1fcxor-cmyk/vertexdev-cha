import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get discoverable servers
router.get('/servers', async (req, res) => {
  try {
    const { category, search, limit = 50, offset = 0 } = req.query;
    const pool = getPool();

    let sql = `SELECT s.*, sm.member_count, u.username as owner_username
               FROM servers s
               LEFT JOIN (SELECT server_id, COUNT(*) as member_count FROM server_members GROUP BY server_id) sm ON s.id = sm.server_id
               LEFT JOIN users u ON s.owner_id = u.id
               WHERE s.public = TRUE AND s.verified = TRUE`;
    const params = [];

    if (category) {
      sql += ' AND s.category = $' + (params.length + 1);
      params.push(category);
    }

    if (search) {
      sql += ' AND (s.name ILIKE $' + (params.length + 1) + ' OR s.description ILIKE $' + (params.length + 2) + ')';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY sm.member_count DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(sql, params);

    res.json({ servers: result.rows });
  } catch (error) {
    console.error('Get discoverable servers error:', error);
    res.status(500).json({ error: 'Failed to get discoverable servers' });
  }
});

// Get trending servers
router.get('/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const pool = getPool();

    const result = await pool.query(
      `SELECT s.*, sm.member_count, 
       COUNT(DISTINCT sm2.user_id) as new_members
       FROM servers s
       LEFT JOIN (SELECT server_id, COUNT(*) as member_count FROM server_members GROUP BY server_id) sm ON s.id = sm.server_id
       LEFT JOIN server_members sm2 ON s.id = sm2.server_id AND sm2.joined_at >= CURRENT_DATE - INTERVAL '7 days'
       WHERE s.public = TRUE
       GROUP BY s.id, sm.member_count
       ORDER BY new_members DESC, sm.member_count DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({ servers: result.rows });
  } catch (error) {
    console.error('Get trending servers error:', error);
    res.status(500).json({ error: 'Failed to get trending servers' });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.query(
      `SELECT DISTINCT category, COUNT(*) as server_count 
       FROM servers 
       WHERE public = TRUE AND category IS NOT NULL
       GROUP BY category
       ORDER BY server_count DESC`
    );

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Join server via discovery
router.post('/servers/:serverId/join', async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if already member
    const existing = await pool.query(
      'SELECT * FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already a member of this server' });
    }

    // Add as member
    await pool.query(
      `INSERT INTO server_members (server_id, user_id, role, joined_at)
       VALUES ($1, $2, 'member', CURRENT_TIMESTAMP)`,
      [serverId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Join server error:', error);
    res.status(500).json({ error: 'Failed to join server' });
  }
});

// Report server
router.post('/servers/:serverId/report', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { reason, description } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `INSERT INTO server_reports (server_id, user_id, reason, description, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [serverId, userId, reason, description]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Report server error:', error);
    res.status(500).json({ error: 'Failed to report server' });
  }
});

// Get featured servers
router.get('/featured', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.query(
      `SELECT s.*, sm.member_count, u.username as owner_username
       FROM servers s
       LEFT JOIN (SELECT server_id, COUNT(*) as member_count FROM server_members GROUP BY server_id) sm ON s.id = sm.server_id
       LEFT JOIN users u ON s.owner_id = u.id
       WHERE s.featured = TRUE
       ORDER BY s.featured_at DESC
       LIMIT 10`
    );

    res.json({ servers: result.rows });
  } catch (error) {
    console.error('Get featured servers error:', error);
    res.status(500).json({ error: 'Failed to get featured servers' });
  }
});

export default router;
