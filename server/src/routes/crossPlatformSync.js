import express from 'express';
import crypto from 'crypto';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get user's sync settings
router.get('/settings', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM sync_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        syncMessages: false,
        syncServers: false,
        syncFriends: false,
        syncSettings: false,
        lastSync: null
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get sync settings error:', error);
    res.status(500).json({ error: 'Failed to get sync settings' });
  }
});

// Update sync settings
router.put('/settings', async (req, res) => {
  try {
    const { syncMessages, syncServers, syncFriends, syncSettings } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `INSERT INTO sync_settings (user_id, sync_messages, sync_servers, sync_friends, sync_settings, last_sync, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET sync_messages = $2, sync_servers = $3, sync_friends = $4, sync_settings = $5, updated_at = CURRENT_TIMESTAMP`,
      [userId, syncMessages || false, syncServers || false, syncFriends || false, syncSettings || false]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update sync settings error:', error);
    res.status(500).json({ error: 'Failed to update sync settings' });
  }
});

// Trigger sync
router.post('/sync', async (req, res) => {
  try {
    const { syncType } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // In a real implementation, this would sync data across platforms
    // For now, we'll just log the sync

    await pool.query(
      `INSERT INTO sync_logs (user_id, sync_type, status, started_at)
       VALUES ($1, $2, 'in_progress', CURRENT_TIMESTAMP)`,
      [userId, syncType || 'full']
    );

    // Update last sync time
    await pool.query(
      `UPDATE sync_settings SET last_sync = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId]
    );

    res.json({ success: true, message: 'Sync initiated' });
  } catch (error) {
    console.error('Trigger sync error:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

// Get sync history
router.get('/history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { limit = 20 } = req.query;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM sync_logs WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2',
      [userId, parseInt(limit)]
    );

    res.json({ history: result.rows });
  } catch (error) {
    console.error('Get sync history error:', error);
    res.status(500).json({ error: 'Failed to get sync history' });
  }
});

// Get connected devices
router.get('/devices', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT * FROM connected_devices WHERE user_id = $1 ORDER BY last_active DESC`,
      [userId]
    );

    res.json({ devices: result.rows });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to get connected devices' });
  }
});

// Register device
router.post('/devices', async (req, res) => {
  try {
    const { deviceName, deviceType, platform } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const deviceId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO connected_devices (id, user_id, device_name, device_type, platform, last_active, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [deviceId, userId, deviceName, deviceType, platform]
    );

    res.status(201).json({ success: true, deviceId });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Revoke device
router.delete('/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      'DELETE FROM connected_devices WHERE id = $1 AND user_id = $2',
      [deviceId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Revoke device error:', error);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

export default router;
