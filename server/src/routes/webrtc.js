import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get or create WebRTC signaling room
router.get('/room/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.headers['x-user-id'];

    // Return signaling room info
    res.json({
      roomId: channelId,
      userId,
      signalingServer: process.env.SIGNALING_SERVER || 'ws://localhost:8888',
      stunServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      turnServers: process.env.TURN_SERVERS ? JSON.parse(process.env.TURN_SERVERS) : []
    });
  } catch (error) {
    console.error('Get WebRTC room error:', error);
    res.status(500).json({ error: 'Failed to get WebRTC room' });
  }
});

// Join voice channel
router.post('/voice/join', async (req, res) => {
  try {
    const { channelId, serverId } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if already in voice
    const existing = await pool.query(
      'SELECT * FROM voice_states WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      // Update existing voice state
      await pool.query(
        `UPDATE voice_states 
         SET channel_id = $1, server_id = $2, joined_at = CURRENT_TIMESTAMP 
         WHERE user_id = $3`,
        [channelId, serverId, userId]
      );
    } else {
      // Create new voice state
      await pool.query(
        `INSERT INTO voice_states (id, user_id, channel_id, server_id, joined_at)
         VALUES (gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP)`,
        [userId, channelId, serverId]
      );
    }

    // Get other users in channel
    const channelUsers = await pool.query(
      `SELECT vs.*, u.username, u.avatar_url
       FROM voice_states vs
       LEFT JOIN users u ON vs.user_id = u.id
       WHERE vs.channel_id = $1 AND vs.user_id != $2`,
      [channelId, userId]
    );

    res.json({ 
      success: true, 
      users: channelUsers.rows 
    });
  } catch (error) {
    console.error('Join voice error:', error);
    res.status(500).json({ error: 'Failed to join voice channel' });
  }
});

// Leave voice channel
router.post('/voice/leave', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      'DELETE FROM voice_states WHERE user_id = $1',
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Leave voice error:', error);
    res.status(500).json({ error: 'Failed to leave voice channel' });
  }
});

// Update voice state (mute, deafen)
router.put('/voice/state', async (req, res) => {
  try {
    const { muted, deafened, selfMute, selfDeaf } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (muted !== undefined) {
      updates.push(`muted = $${paramIndex++}`);
      params.push(muted);
    }
    if (deafened !== undefined) {
      updates.push(`deafened = $${paramIndex++}`);
      params.push(deafened);
    }
    if (selfMute !== undefined) {
      updates.push(`self_mute = $${paramIndex++}`);
      params.push(selfMute);
    }
    if (selfDeaf !== undefined) {
      updates.push(`self_deaf = $${paramIndex++}`);
      params.push(selfDeaf);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No state updates provided' });
    }

    params.push(userId);

    await pool.query(
      `UPDATE voice_states SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update voice state error:', error);
    res.status(500).json({ error: 'Failed to update voice state' });
  }
});

// Get users in voice channel
router.get('/voice/channel/:channelId/users', async (req, res) => {
  try {
    const { channelId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT vs.*, u.username, u.avatar_url, u.status
       FROM voice_states vs
       LEFT JOIN users u ON vs.user_id = u.id
       WHERE vs.channel_id = $1`,
      [channelId]
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get voice users error:', error);
    res.status(500).json({ error: 'Failed to get voice channel users' });
  }
});

// Start screen share
router.post('/screen-share/start', async (req, res) => {
  try {
    const { channelId } = req.body;
    const userId = req.headers['x-user-id'];

    res.json({
      success: true,
      screenShareId: `${userId}-${Date.now()}`,
      signalingServer: process.env.SIGNALING_SERVER || 'ws://localhost:8888'
    });
  } catch (error) {
    console.error('Start screen share error:', error);
    res.status(500).json({ error: 'Failed to start screen share' });
  }
});

// Stop screen share
router.post('/screen-share/stop', async (req, res) => {
  try {
    const { screenShareId } = req.body;

    res.json({ success: true });
  } catch (error) {
    console.error('Stop screen share error:', error);
    res.status(500).json({ error: 'Failed to stop screen share' });
  }
});

export default router;
