import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create warning
router.post('/', async (req, res) => {
  try {
    const { serverId, userId, reason, type, severity } = req.body;
    const moderatorId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND (role = 'admin' OR role = 'moderator')`,
      [serverId, moderatorId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const warningId = uuidv4();

    await pool.query(
      `INSERT INTO warnings (id, server_id, user_id, reason, type, severity, moderator_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [warningId, serverId, userId, reason, type, severity || 'medium', moderatorId]
    );

    const result = await pool.query(
      'SELECT * FROM warnings WHERE id = $1',
      [warningId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create warning error:', error);
    res.status(500).json({ error: 'Failed to create warning' });
  }
});

// Get warnings for user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { serverId } = req.query;
    const pool = getPool();

    let sql = `SELECT w.*, u.username as moderator_username 
               FROM warnings w
               LEFT JOIN users u ON w.moderator_id = u.id
               WHERE w.user_id = $1`;
    const params = [userId];

    if (serverId) {
      sql += ' AND w.server_id = $2';
      params.push(serverId);
    }

    sql += ' ORDER BY w.created_at DESC';

    const result = await pool.query(sql, params);

    res.json({ warnings: result.rows });
  } catch (error) {
    console.error('Get warnings error:', error);
    res.status(500).json({ error: 'Failed to get warnings' });
  }
});

// Get warnings for server
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { limit = 50 } = req.query;
    const pool = getPool();

    const result = await pool.query(
      `SELECT w.*, u.username as user_username, m.username as moderator_username
       FROM warnings w
       LEFT JOIN users u ON w.user_id = u.id
       LEFT JOIN users m ON w.moderator_id = m.id
       WHERE w.server_id = $1
       ORDER BY w.created_at DESC
       LIMIT $2`,
      [serverId, parseInt(limit)]
    );

    res.json({ warnings: result.rows });
  } catch (error) {
    console.error('Get server warnings error:', error);
    res.status(500).json({ error: 'Failed to get server warnings' });
  }
});

// Acknowledge warning
router.post('/:warningId/acknowledge', async (req, res) => {
  try {
    const { warningId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      'UPDATE warnings SET acknowledged = TRUE, acknowledged_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [warningId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Acknowledge warning error:', error);
    res.status(500).json({ error: 'Failed to acknowledge warning' });
  }
});

// Delete warning (moderator only)
router.delete('/:warningId', async (req, res) => {
  try {
    const { warningId } = req.params;
    const moderatorId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const warning = await pool.query(
      'SELECT * FROM warnings WHERE id = $1',
      [warningId]
    );

    if (warning.rows.length === 0) {
      return res.status(404).json({ error: 'Warning not found' });
    }

    const permissionCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND (role = 'admin' OR role = 'moderator')`,
      [warning.rows[0].server_id, moderatorId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query('DELETE FROM warnings WHERE id = $1', [warningId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete warning error:', error);
    res.status(500).json({ error: 'Failed to delete warning' });
  }
});

// Get warning statistics
router.get('/stats/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const total = await pool.query(
      'SELECT COUNT(*) as count FROM warnings WHERE server_id = $1',
      [serverId]
    );

    const bySeverity = await pool.query(
      `SELECT severity, COUNT(*) as count 
       FROM warnings 
       WHERE server_id = $1 
       GROUP BY severity`,
      [serverId]
    );

    const byType = await pool.query(
      `SELECT type, COUNT(*) as count 
       FROM warnings 
       WHERE server_id = $1 
       GROUP BY type`,
      [serverId]
    );

    res.json({
      total: parseInt(total.rows[0].count),
      bySeverity: bySeverity.rows,
      byType: byType.rows
    });
  } catch (error) {
    console.error('Get warning stats error:', error);
    res.status(500).json({ error: 'Failed to get warning statistics' });
  }
});

export default router;
