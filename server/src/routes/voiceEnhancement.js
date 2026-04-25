import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get voice enhancement settings for a user
router.get('/settings', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT 
        noise_cancellation,
        noise_suppression_level,
        echo_cancellation,
        auto_gain,
        auto_gain_level,
        voice_isolation,
        voice_activity_detection
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      noiseCancellation: user.noise_cancellation || false,
      noiseSuppressionLevel: user.noise_suppression_level || 'medium',
      echoCancellation: user.echo_cancellation || true,
      autoGain: user.auto_gain || false,
      autoGainLevel: user.auto_gain_level || 'medium',
      voiceIsolation: user.voice_isolation || false,
      voiceActivityDetection: user.voice_activity_detection || true
    });
  } catch (error) {
    console.error('Get voice enhancement settings error:', error);
    res.status(500).json({ error: 'Failed to get voice enhancement settings' });
  }
});

// Update voice enhancement settings
router.put('/settings', async (req, res) => {
  try {
    const { 
      noiseCancellation, 
      noiseSuppressionLevel, 
      echoCancellation, 
      autoGain, 
      autoGainLevel,
      voiceIsolation,
      voiceActivityDetection
    } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (noiseCancellation !== undefined) {
      updates.push(`noise_cancellation = $${paramIndex++}`);
      params.push(noiseCancellation);
    }
    if (noiseSuppressionLevel !== undefined) {
      updates.push(`noise_suppression_level = $${paramIndex++}`);
      params.push(noiseSuppressionLevel);
    }
    if (echoCancellation !== undefined) {
      updates.push(`echo_cancellation = $${paramIndex++}`);
      params.push(echoCancellation);
    }
    if (autoGain !== undefined) {
      updates.push(`auto_gain = $${paramIndex++}`);
      params.push(autoGain);
    }
    if (autoGainLevel !== undefined) {
      updates.push(`auto_gain_level = $${paramIndex++}`);
      params.push(autoGainLevel);
    }
    if (voiceIsolation !== undefined) {
      updates.push(`voice_isolation = $${paramIndex++}`);
      params.push(voiceIsolation);
    }
    if (voiceActivityDetection !== undefined) {
      updates.push(`voice_activity_detection = $${paramIndex++}`);
      params.push(voiceActivityDetection);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update voice enhancement settings error:', error);
    res.status(500).json({ error: 'Failed to update voice enhancement settings' });
  }
});

// Get available voice enhancement options
router.get('/options', (req, res) => {
  const options = {
    noiseSuppressionLevels: [
      { id: 'low', name: 'Low', description: 'Minimal noise suppression' },
      { id: 'medium', name: 'Medium', description: 'Balanced noise suppression' },
      { id: 'high', name: 'High', description: 'Maximum noise suppression' }
    ],
    autoGainLevels: [
      { id: 'low', name: 'Low', description: 'Minimal volume adjustment' },
      { id: 'medium', name: 'Medium', description: 'Balanced volume adjustment' },
      { id: 'high', name: 'High', description: 'Aggressive volume adjustment' }
    ],
    features: [
      {
        id: 'noise_cancellation',
        name: 'Noise Cancellation',
        description: 'Remove background noise from your microphone'
      },
      {
        id: 'echo_cancellation',
        name: 'Echo Cancellation',
        description: 'Remove echo from your audio'
      },
      {
        id: 'auto_gain',
        name: 'Auto Gain',
        description: 'Automatically adjust microphone volume'
      },
      {
        id: 'voice_isolation',
        name: 'Voice Isolation',
        description: 'Focus on your voice and suppress other sounds'
      },
      {
        id: 'voice_activity_detection',
        name: 'Voice Activity Detection',
        description: 'Automatically detect when you\'re speaking'
      }
    ]
  };

  res.json(options);
});

// Test voice enhancement (would integrate with audio processing)
router.post('/test', async (req, res) => {
  try {
    const { settings } = req.body;

    // This would integrate with actual audio processing libraries
    // For now, just return a simulated result
    res.json({
      success: true,
      message: 'Voice enhancement test completed',
      results: {
        noiseReduction: settings.noiseCancellation ? '85%' : '0%',
        echoReduction: settings.echoCancellation ? '90%' : '0%',
        voiceClarity: settings.voiceIsolation ? '92%' : '75%',
        overallQuality: 'Good'
      }
    });
  } catch (error) {
    console.error('Test voice enhancement error:', error);
    res.status(500).json({ error: 'Failed to test voice enhancement' });
  }
});

// Get voice quality metrics
router.get('/metrics', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Get recent voice session metrics (simplified)
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_sessions,
        AVG(duration) as avg_duration
       FROM voice_states
       WHERE user_id = $1
       AND joined_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    res.json({
      sessions: result.rows[0].total_sessions || 0,
      averageDuration: result.rows[0].avg_duration || 0,
      qualityMetrics: {
        latency: '25ms',
        packetLoss: '0.5%',
        jitter: '5ms',
        overallScore: 95
      }
    });
  } catch (error) {
    console.error('Get voice metrics error:', error);
    res.status(500).json({ error: 'Failed to get voice metrics' });
  }
});

export default router;
