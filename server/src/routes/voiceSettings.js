import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get voice channel settings
router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM voice_channel_settings WHERE channel_id = $1',
      [channelId]
    );

    if (result.rows.length === 0) {
      // Return default settings
      return res.json({
        region: 'us-west',
        bitrate: 64000,
        userLimit: null,
        afkChannelId: null,
        afkTimeout: 300,
        videoQuality: '720p',
        noiseCancellation: true,
        spatialAudio: false
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get voice settings error:', error);
    res.status(500).json({ error: 'Failed to get voice channel settings' });
  }
});

// Update voice channel settings
router.put('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { region, bitrate, userLimit, afkChannelId, afkTimeout, videoQuality, noiseCancellation, spatialAudio } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user has permission (admin or owner)
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

    // Check if settings exist
    const existing = await pool.query(
      'SELECT * FROM voice_channel_settings WHERE channel_id = $1',
      [channelId]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        `UPDATE voice_channel_settings 
         SET region = COALESCE($2, region),
             bitrate = COALESCE($3, bitrate),
             user_limit = COALESCE($4, user_limit),
             afk_channel_id = COALESCE($5, afk_channel_id),
             afk_timeout = COALESCE($6, afk_timeout),
             video_quality = COALESCE($7, video_quality),
             noise_cancellation = COALESCE($8, noise_cancellation),
             spatial_audio = COALESCE($9, spatial_audio)
         WHERE channel_id = $1`,
        [channelId, region, bitrate, userLimit, afkChannelId, afkTimeout, videoQuality, noiseCancellation, spatialAudio]
      );
    } else {
      // Create new
      await pool.query(
        `INSERT INTO voice_channel_settings (id, channel_id, region, bitrate, user_limit, afk_channel_id, afk_timeout, video_quality, noise_cancellation, spatial_audio, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
        [channelId, region || 'us-west', bitrate || 64000, userLimit, afkChannelId, afkTimeout || 300, videoQuality || '720p', noiseCancellation !== false, spatialAudio || false]
      );
    }

    const result = await pool.query(
      'SELECT * FROM voice_channel_settings WHERE channel_id = $1',
      [channelId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update voice settings error:', error);
    res.status(500).json({ error: 'Failed to update voice channel settings' });
  }
});

// Get available regions
router.get('/regions', (req, res) => {
  const regions = [
    { id: 'us-west', name: 'US West', latency: 20 },
    { id: 'us-east', name: 'US East', latency: 25 },
    { id: 'us-central', name: 'US Central', latency: 30 },
    { id: 'eu-west', name: 'Europe West', latency: 40 },
    { id: 'eu-central', name: 'Europe Central', latency: 45 },
    { id: 'asia-east', name: 'Asia East', latency: 80 },
    { id: 'asia-southeast', name: 'Asia Southeast', latency: 90 },
    { id: 'australia', name: 'Australia', latency: 120 },
    { id: 'south-america', name: 'South America', latency: 100 }
  ];

  res.json({ regions });
});

// Get available video qualities
router.get('/video-qualities', (req, res) => {
  const qualities = [
    { id: '480p', name: '480p', bitrate: 1000, recommendedBandwidth: 1500 },
    { id: '720p', name: '720p HD', bitrate: 2500, recommendedBandwidth: 3500 },
    { id: '1080p', name: '1080p Full HD', bitrate: 4500, recommendedBandwidth: 6000 },
    { id: '1440p', name: '1440p 2K', bitrate: 9000, recommendedBandwidth: 12000 },
    { id: '4k', name: '4K Ultra HD', bitrate: 18000, recommendedBandwidth: 25000 }
  ];

  res.json({ qualities });
});

// Get voice channel statistics
router.get('/channel/:channelId/stats', async (req, res) => {
  try {
    const { channelId } = req.params;
    const pool = getPool();

    // Get current users in voice
    const usersResult = await pool.query(
      `SELECT vs.*, u.username, u.avatar_url
       FROM voice_states vs
       LEFT JOIN users u ON vs.user_id = u.id
       WHERE vs.channel_id = $1`,
      [channelId]
    );

    // Calculate average bitrate usage
    const totalUsers = usersResult.rows.length;
    const estimatedBitrate = totalUsers * 64000; // 64kbps per user

    res.json({
      currentUsers: totalUsers,
      users: usersResult.rows,
      estimatedBitrate,
      recommendedSettings: {
        bitrate: totalUsers > 10 ? 48000 : 64000,
        noiseCancellation: totalUsers > 5,
        spatialAudio: totalUsers > 3
      }
    });
  } catch (error) {
    console.error('Get voice stats error:', error);
    res.status(500).json({ error: 'Failed to get voice channel statistics' });
  }
});

export default router;
