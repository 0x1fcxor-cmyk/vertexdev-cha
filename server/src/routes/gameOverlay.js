import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Supported games database
const SUPPORTED_GAMES = {
  'steam': {
    name: 'Steam Games',
    detectionMethod: 'process'
  },
  'epic': {
    name: 'Epic Games',
    detectionMethod: 'process'
  },
  'battlefield': {
    name: 'Battlefield',
    detectionMethod: 'process'
  },
  'valorant': {
    name: 'VALORANT',
    detectionMethod: 'process'
  },
  'league': {
    name: 'League of Legends',
    detectionMethod: 'process'
  },
  'minecraft': {
    name: 'Minecraft',
    detectionMethod: 'process'
  },
  'spotify': {
    name: 'Spotify',
    detectionMethod: 'api'
  },
  'youtube': {
    name: 'YouTube',
    detectionMethod: 'api'
  },
  'netflix': {
    name: 'Netflix',
    detectionMethod: 'api'
  },
  'vscode': {
    name: 'Visual Studio Code',
    detectionMethod: 'process'
  }
};

// Update user's rich presence
router.post('/presence', async (req, res) => {
  try {
    const { activityType, activityName, state, details, largeImage, smallImage, partySize, partyMax, timestamps } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `UPDATE users 
       SET activity_type = $1,
           activity_name = $2,
           activity_state = $3,
           activity_details = $4,
           activity_large_image = $5,
           activity_small_image = $6,
           activity_party_size = $7,
           activity_party_max = $8,
           activity_timestamps = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        activityType || null,
        activityName || null,
        state || null,
        details || null,
        largeImage || null,
        smallImage || null,
        partySize || null,
        partyMax || null,
        timestamps ? JSON.stringify(timestamps) : null,
        userId
      ]
    );

    // Emit presence update via Socket.io
    const io = req.app.get('io');
    io.emit('presence:update', {
      userId,
      activityType,
      activityName,
      state,
      details
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update presence error:', error);
    res.status(500).json({ error: 'Failed to update presence' });
  }
});

// Get user's current presence
router.get('/presence/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT 
        username,
        avatar_url,
        status,
        activity_type,
        activity_name,
        activity_state,
        activity_details,
        activity_large_image,
        activity_small_image,
        activity_party_size,
        activity_party_max,
        activity_timestamps
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const presence = {
      userId,
      username: user.username,
      avatarUrl: user.avatar_url,
      status: user.status,
      activity: user.activity_type ? {
        type: user.activity_type,
        name: user.activity_name,
        state: user.activity_state,
        details: user.activity_details,
        assets: {
          largeImage: user.activity_large_image,
          smallImage: user.activity_small_image
        },
        party: user.activity_party_size ? {
          size: user.activity_party_size,
          max: user.activity_party_max
        } : null,
        timestamps: user.activity_timestamps ? JSON.parse(user.activity_timestamps) : null
      } : null
    };

    res.json(presence);
  } catch (error) {
    console.error('Get presence error:', error);
    res.status(500).json({ error: 'Failed to get presence' });
  }
});

// Get supported games
router.get('/games/supported', (req, res) => {
  res.json({ games: SUPPORTED_GAMES });
});

// Detect running game (simplified - would integrate with actual detection)
router.post('/games/detect', async (req, res) => {
  try {
    const { processes } = req.body;

    // Simplified detection based on process names
    const detectedGames = [];

    if (processes) {
      for (const process of processes) {
        const processLower = process.toLowerCase();
        
        if (processLower.includes('valorant')) {
          detectedGames.push({ id: 'valorant', name: 'VALORANT' });
        } else if (processLower.includes('league') || processLower.includes('lol')) {
          detectedGames.push({ id: 'league', name: 'League of Legends' });
        } else if (processLower.includes('minecraft')) {
          detectedGames.push({ id: 'minecraft', name: 'Minecraft' });
        } else if (processLower.includes('battlefield')) {
          detectedGames.push({ id: 'battlefield', name: 'Battlefield' });
        } else if (processLower.includes('code.exe') || processLower.includes('vscode')) {
          detectedGames.push({ id: 'vscode', name: 'Visual Studio Code' });
        }
      }
    }

    res.json({ detectedGames });
  } catch (error) {
    console.error('Detect games error:', error);
    res.status(500).json({ error: 'Failed to detect games' });
  }
});

// Create game session
router.post('/sessions', async (req, res) => {
  try {
    const { gameId, serverId, channelId } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const sessionId = uuidv4();

    await pool.query(
      `INSERT INTO game_sessions (id, user_id, server_id, channel_id, game_id, started_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [sessionId, userId, serverId || null, channelId || null, gameId]
    );

    res.status(201).json({ sessionId });
  } catch (error) {
    console.error('Create game session error:', error);
    res.status(500).json({ error: 'Failed to create game session' });
  }
});

// End game session
router.post('/sessions/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { duration } = req.body;
    const pool = getPool();

    await pool.query(
      `UPDATE game_sessions 
       SET ended_at = CURRENT_TIMESTAMP,
           duration = $1
       WHERE id = $2`,
      [duration, sessionId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('End game session error:', error);
    res.status(500).json({ error: 'Failed to end game session' });
  }
});

// Get user's game history
router.get('/sessions/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    const pool = getPool();

    const result = await pool.query(
      `SELECT gs.*, s.name as server_name, c.name as channel_name
       FROM game_sessions gs
       LEFT JOIN servers s ON gs.server_id = s.id
       LEFT JOIN channels c ON gs.channel_id = c.id
       WHERE gs.user_id = $1
       ORDER BY gs.started_at DESC
       LIMIT $2`,
      [userId, parseInt(limit)]
    );

    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ error: 'Failed to get game history' });
  }
});

// Get server's active game sessions
router.get('/sessions/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT gs.*, u.username, u.avatar_url
       FROM game_sessions gs
       LEFT JOIN users u ON gs.user_id = u.id
       WHERE gs.server_id = $1
       AND gs.ended_at IS NULL
       ORDER BY gs.started_at DESC`,
      [serverId]
    );

    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Get server game sessions error:', error);
    res.status(500).json({ error: 'Failed to get server game sessions' });
  }
});

export default router;
