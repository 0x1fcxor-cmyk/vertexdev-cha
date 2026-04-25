import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get spatial audio configuration for a voice channel
router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT * FROM voice_channel_settings WHERE channel_id = $1`,
      [channelId]
    );

    if (result.rows.length === 0) {
      return res.json({
        enabled: false,
        maxDistance: 100,
        rollOffFactor: 1,
        dopplerEffect: false
      });
    }

    const settings = result.rows[0];
    res.json({
      enabled: settings.spatial_audio || false,
      maxDistance: 100,
      rollOffFactor: 1,
      dopplerEffect: false
    });
  } catch (error) {
    console.error('Get spatial audio settings error:', error);
    res.status(500).json({ error: 'Failed to get spatial audio settings' });
  }
});

// Update spatial audio configuration
router.put('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { enabled, maxDistance, rollOffFactor, dopplerEffect } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT c.server_id 
       FROM channels c
       LEFT JOIN server_members sm ON c.server_id = sm.server_id
       WHERE c.id = $1 AND sm.user_id = $2 AND (sm.role = 'admin' OR c.server_id = (SELECT owner_id FROM servers WHERE id = c.server_id))`,
      [channelId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query(
      `UPDATE voice_channel_settings 
       SET spatial_audio = $1
       WHERE channel_id = $2`,
      [enabled, channelId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update spatial audio settings error:', error);
    res.status(500).json({ error: 'Failed to update spatial audio settings' });
  }
});

// Calculate spatial audio parameters for users
router.post('/calculate', async (req, res) => {
  try {
    const { channelId, userIds, positions } = req.body;
    const pool = getPool();

    // Get all users in the voice channel
    const voiceStatesResult = await pool.query(
      `SELECT vs.user_id, vs.x_position, vs.y_position, vs.z_position
       FROM voice_states vs
       WHERE vs.channel_id = $1`,
      [channelId]
    );

    const users = voiceStatesResult.rows;
    const spatialData = {};

    // Calculate audio parameters for each user pair
    for (const user of users) {
      if (!positions[user.user_id]) continue;

      const userPosition = positions[user.user_id];
      spatialData[user.user_id] = {};

      for (const otherUser of users) {
        if (otherUser.user_id === user.user_id) continue;
        if (!positions[otherUser.user_id]) continue;

        const otherPosition = positions[otherUser.user_id];

        // Calculate distance
        const distance = Math.sqrt(
          Math.pow(userPosition.x - otherPosition.x, 2) +
          Math.pow(userPosition.y - otherPosition.y, 2) +
          Math.pow(userPosition.z - otherPosition.z, 2)
        );

        // Calculate volume based on distance (inverse square law)
        const maxDistance = 100;
        const volume = Math.max(0, 1 - (distance / maxDistance));

        // Calculate pan (left/right)
        const pan = Math.max(-1, Math.min(1, (otherPosition.x - userPosition.x) / 50));

        spatialData[user.user_id][otherUser.user_id] = {
          distance: Math.round(distance * 100) / 100,
          volume: Math.round(volume * 100) / 100,
          pan: Math.round(pan * 100) / 100
        };
      }
    }

    res.json({ spatialData });
  } catch (error) {
    console.error('Calculate spatial audio error:', error);
    res.status(500).json({ error: 'Failed to calculate spatial audio' });
  }
});

// Update user position in voice channel
router.post('/position', async (req, res) => {
  try {
    const { channelId, x, y, z } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `UPDATE voice_states 
       SET x_position = $1, y_position = $2, z_position = $3
       WHERE user_id = $4 AND channel_id = $5`,
      [x, y, z, userId, channelId]
    );

    // Emit position update to other users via Socket.io
    const io = req.app.get('io');
    io.to(`voice:${channelId}`).emit('voice:position_update', {
      userId,
      channelId,
      position: { x, y, z }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update position error:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// Get user positions in voice channel
router.get('/channel/:channelId/positions', async (req, res) => {
  try {
    const { channelId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT vs.user_id, vs.x_position, vs.y_position, vs.z_position, u.username
       FROM voice_states vs
       LEFT JOIN users u ON vs.user_id = u.id
       WHERE vs.channel_id = $1`,
      [channelId]
    );

    const positions = {};
    result.rows.forEach(row => {
      positions[row.user_id] = {
        x: row.x_position || 0,
        y: row.y_position || 0,
        z: row.z_position || 0,
        username: row.username
      };
    });

    res.json({ positions });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ error: 'Failed to get positions' });
  }
});

// Reset user position
router.delete('/position', async (req, res) => {
  try {
    const { channelId } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `UPDATE voice_states 
       SET x_position = 0, y_position = 0, z_position = 0
       WHERE user_id = $1 AND channel_id = $2`,
      [userId, channelId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Reset position error:', error);
    res.status(500).json({ error: 'Failed to reset position' });
  }
});

export default router;
