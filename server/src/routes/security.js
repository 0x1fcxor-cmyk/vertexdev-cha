import express from 'express';
import crypto from 'crypto';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get security settings
router.get('/settings', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const settingsResult = await pool.query(
      'SELECT * FROM security_settings ORDER BY key'
    );

    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json({ settings });
  } catch (error) {
    console.error('Get security settings error:', error);
    res.status(500).json({ error: 'Failed to get security settings' });
  }
});

// Update security settings
router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO security_settings (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({ error: 'Failed to update security settings' });
  }
});

// Get security events
router.get('/events', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { limit = 50, offset = 0 } = req.query;
    const pool = getPool();

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      `SELECT se.*, u.username 
       FROM security_events se
       LEFT JOIN users u ON se.user_id = u.id
       ORDER BY se.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );

    res.json({ events: result.rows });
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({ error: 'Failed to get security events' });
  }
});

// Get user's security events
router.get('/my-events', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { limit = 20 } = req.query;
    const pool = getPool();

    const result = await pool.query(
      `SELECT * FROM security_events 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, parseInt(limit)]
    );

    res.json({ events: result.rows });
  } catch (error) {
    console.error('Get user security events error:', error);
    res.status(500).json({ error: 'Failed to get security events' });
  }
});

// Add IP to blacklist
router.post('/ip-blacklist', async (req, res) => {
  try {
    const { ip, reason, duration } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const expiresAt = duration 
      ? new Date(Date.now() + duration * 60 * 60 * 1000)
      : null;

    await pool.query(
      `INSERT INTO ip_blacklist (ip, reason, added_by, expires_at, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [ip, reason, userId, expiresAt]
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Add IP to blacklist error:', error);
    res.status(500).json({ error: 'Failed to add IP to blacklist' });
  }
});

// Remove IP from blacklist
router.delete('/ip-blacklist/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await pool.query(
      'UPDATE ip_blacklist SET active = FALSE WHERE ip = $1',
      [ip]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Remove IP from blacklist error:', error);
    res.status(500).json({ error: 'Failed to remove IP from blacklist' });
  }
});

// Get blacklist
router.get('/ip-blacklist', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      'SELECT * FROM ip_blacklist WHERE active = TRUE ORDER BY created_at DESC'
    );

    res.json({ blacklist: result.rows });
  } catch (error) {
    console.error('Get blacklist error:', error);
    res.status(500).json({ error: 'Failed to get blacklist' });
  }
});

// Add IP to whitelist
router.post('/ip-whitelist', async (req, res) => {
  try {
    const { ip, reason } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await pool.query(
      `INSERT INTO ip_whitelist (ip, reason, added_by, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [ip, reason, userId]
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Add IP to whitelist error:', error);
    res.status(500).json({ error: 'Failed to add IP to whitelist' });
  }
});

// Get whitelist
router.get('/ip-whitelist', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      'SELECT * FROM ip_whitelist WHERE active = TRUE ORDER BY created_at DESC'
    );

    res.json({ whitelist: result.rows });
  } catch (error) {
    console.error('Get whitelist error:', error);
    res.status(500).json({ error: 'Failed to get whitelist' });
  }
});

// Enable 2FA
router.post('/2fa/enable', async (req, res) => {
  try {
    const { method } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    if (method === 'totp') {
      const secret = crypto.randomBytes(32).toString('hex');
      
      await pool.query(
        `UPDATE users 
         SET totp_secret = $2, two_factor_enabled = TRUE, two_factor_method = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [userId, secret, 'totp']
      );

      res.json({ success: true, secret });
    } else if (method === 'sms') {
      // SMS implementation would go here
      res.json({ success: true, message: 'SMS 2FA not yet implemented' });
    } else {
      res.status(400).json({ error: 'Invalid 2FA method' });
    }
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

// Disable 2FA
router.post('/2fa/disable', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `UPDATE users 
       SET two_factor_enabled = FALSE, totp_secret = NULL, two_factor_method = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Get security audit
router.get('/audit', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const audit = {};

    // Get failed login attempts
    const failedLogins = await pool.query(
      'SELECT COUNT(*) as count FROM failed_login_attempts WHERE created_at >= CURRENT_DATE - INTERVAL \'7 days\''
    );
    audit.failedLogins = parseInt(failedLogins.rows[0].count);

    // Get security events
    const securityEvents = await pool.query(
      'SELECT COUNT(*) as count FROM security_events WHERE created_at >= CURRENT_DATE - INTERVAL \'7 days\''
    );
    audit.securityEvents = parseInt(securityEvents.rows[0].count);

    // Get blacklisted IPs
    const blacklistedIPs = await pool.query(
      'SELECT COUNT(*) as count FROM ip_blacklist WHERE active = TRUE'
    );
    audit.blacklistedIPs = parseInt(blacklistedIPs.rows[0].count);

    // Get users with 2FA enabled
    const twoFactorUsers = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE two_factor_enabled = TRUE'
    );
    audit.twoFactorUsers = parseInt(twoFactorUsers.rows[0].count);

    // Get total users
    const totalUsers = await pool.query(
      'SELECT COUNT(*) as count FROM users'
    );
    audit.totalUsers = parseInt(totalUsers.rows[0].count);

    // Calculate 2FA adoption rate
    audit.twoFactorAdoptionRate = audit.totalUsers > 0 
      ? (audit.twoFactorUsers / audit.totalUsers * 100).toFixed(2) + '%'
      : '0%';

    res.json({ audit });
  } catch (error) {
    console.error('Get security audit error:', error);
    res.status(500).json({ error: 'Failed to get security audit' });
  }
});

// Get login history
router.get('/login-history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { limit = 20 } = req.query;
    const pool = getPool();

    const result = await pool.query(
      `SELECT * FROM login_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, parseInt(limit)]
    );

    res.json({ history: result.rows });
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({ error: 'Failed to get login history' });
  }
});

// Revoke all sessions
router.post('/revoke-sessions', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      'UPDATE users SET session_version = session_version + 1 WHERE id = $1',
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Revoke sessions error:', error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

export default router;
