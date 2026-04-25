import express from 'express';
import { getPool } from '../database/connection.js';
import { hasPermission, Permissions } from '../utils/permissions.js';

const router = express.Router();

// Middleware to check admin permissions
const requireAdmin = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const pool = getPool();

  try {
    // Check if user is admin in any server
    const result = await pool.query(
      `SELECT sm.*, s.owner_id 
       FROM server_members sm
       JOIN servers s ON sm.server_id = s.id
       WHERE sm.user_id = $1 AND (sm.role = 'admin' OR sm.user_id = s.owner_id)
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    req.adminServerId = result.rows[0].server_id;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Failed to check admin privileges' });
  }
};

// Get server statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();

    const stats = {
      users: (await pool.query('SELECT COUNT(*) as count FROM users')).rows[0].count,
      servers: (await pool.query('SELECT COUNT(*) as count FROM servers')).rows[0].count,
      channels: (await pool.query('SELECT COUNT(*) as count FROM channels')).rows[0].count,
      messages: (await pool.query('SELECT COUNT(*) as count FROM messages')).rows[0].count,
      onlineUsers: (await pool.query("SELECT COUNT(*) as count FROM users WHERE status = 'online'")).rows[0].count,
      uploads: (await pool.query('SELECT COUNT(*) as count FROM uploads')).rows[0].count
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get all users (admin only)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT id, username, email, status, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Ban user
router.post('/users/:userId/ban', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const pool = getPool();

    // Update user status to banned
    await pool.query(
      `UPDATE users SET status = 'banned' WHERE id = $1`,
      [userId]
    );

    // Log ban action
    await pool.query(
      `INSERT INTO audit_log (action, target_user_id, performed_by, reason, created_at)
       VALUES ('ban', $1, $2, $3, CURRENT_TIMESTAMP)`,
      [userId, req.headers['x-user-id'], reason]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban user
router.post('/users/:userId/unban', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    await pool.query(
      `UPDATE users SET status = 'offline' WHERE id = $1`,
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Delete user account
router.delete('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get audit log
router.get('/audit-log', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const { limit = 100 } = req.query;

    const result = await pool.query(
      `SELECT al.*, u.username as performed_by_username 
       FROM audit_log al
       LEFT JOIN users u ON al.performed_by = u.id
       ORDER BY al.created_at DESC 
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

// Create audit log table
router.post('/init-audit-log', async (req, res) => {
  try {
    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(50) NOT NULL,
        target_user_id UUID,
        performed_by UUID REFERENCES users(id),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    res.json({ success: true });
  } catch (error) {
    console.error('Init audit log error:', error);
    res.status(500).json({ error: 'Failed to create audit log table' });
  }
});

export default router;
