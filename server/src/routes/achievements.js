import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get available achievements
router.get('/available', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM achievements WHERE enabled = TRUE ORDER BY category, name'
    );

    res.json({ achievements: result.rows });
  } catch (error) {
    console.error('Get available achievements error:', error);
    res.status(500).json({ error: 'Failed to get available achievements' });
  }
});

// Get user's achievements
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT ua.*, a.name, a.description, a.icon, a.category, a.xp_reward
       FROM user_achievements ua
       LEFT JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
      [userId]
    );

    res.json({ achievements: result.rows });
  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({ error: 'Failed to get user achievements' });
  }
});

// Get user's XP and level
router.get('/xp/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM user_xp WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ xp: 0, level: 1, totalXp: 0 });
    }

    const xp = result.rows[0];
    const level = calculateLevel(xp.total_xp);
    const xpForNextLevel = getXpForLevel(level + 1);
    const xpInCurrentLevel = xp.total_xp - getXpForLevel(level);
    const progress = (xpInCurrentLevel / (xpForNextLevel - getXpForLevel(level))) * 100;

    res.json({ 
      xp: xp.total_xp, 
      level, 
      totalXp: xp.total_xp,
      xpForNextLevel,
      xpInCurrentLevel,
      progress: Math.min(progress, 100)
    });
  } catch (error) {
    console.error('Get user XP error:', error);
    res.status(500).json({ error: 'Failed to get user XP' });
  }
});

// Award XP to user
router.post('/xp/award', async (req, res) => {
  try {
    const { userId, amount, reason, sourceType, sourceId } = req.body;
    const pool = getPool();

    // Add XP
    await pool.query(
      `INSERT INTO user_xp (user_id, total_xp, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET total_xp = total_xp + $2, updated_at = CURRENT_TIMESTAMP`,
      [userId, amount]
    );

    // Log XP gain
    await pool.query(
      `INSERT INTO xp_history (user_id, amount, reason, source_type, source_id, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [userId, amount, reason, sourceType, sourceId]
    );

    // Check for level up
    const xpResult = await pool.query(
      'SELECT total_xp FROM user_xp WHERE user_id = $1',
      [userId]
    );

    const newLevel = calculateLevel(xpResult.rows[0].total_xp);
    const oldLevelResult = await pool.query(
      'SELECT level FROM user_levels WHERE user_id = $1',
      [userId]
    );

    const oldLevel = oldLevelResult.rows.length > 0 ? oldLevelResult.rows[0].level : 1;

    if (newLevel > oldLevel) {
      // Level up!
      await pool.query(
        `INSERT INTO user_levels (user_id, level, leveled_up_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET level = $2, leveled_up_at = CURRENT_TIMESTAMP`,
        [userId, newLevel]
      );

      return res.json({ success: true, amount, newLevel, leveledUp: true });
    }

    res.json({ success: true, amount, leveledUp: false });
  } catch (error) {
    console.error('Award XP error:', error);
    res.status(500).json({ error: 'Failed to award XP' });
  }
});

// Unlock achievement
router.post('/unlock', async (req, res) => {
  try {
    const { userId, achievementId } = req.body;
    const pool = getPool();

    // Check if already unlocked
    const existing = await pool.query(
      'SELECT * FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
      [userId, achievementId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Achievement already unlocked' });
    }

    // Get achievement details
    const achievement = await pool.query(
      'SELECT * FROM achievements WHERE id = $1',
      [achievementId]
    );

    if (achievement.rows.length === 0) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    // Unlock achievement
    await pool.query(
      `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [userId, achievementId]
    );

    // Award XP for achievement
    if (achievement.rows[0].xp_reward > 0) {
      await pool.query(
        `INSERT INTO user_xp (user_id, total_xp, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET total_xp = total_xp + $2, updated_at = CURRENT_TIMESTAMP`,
        [userId, achievement.rows[0].xp_reward]
      );
    }

    res.status(201).json({ success: true, achievement: achievement.rows[0] });
  } catch (error) {
    console.error('Unlock achievement error:', error);
    res.status(500).json({ error: 'Failed to unlock achievement' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'xp', limit = 50 } = req.query;
    const pool = getPool();

    let result;
    if (type === 'xp') {
      result = await pool.query(
        `SELECT ux.*, u.username, u.avatar_url
         FROM user_xp ux
         LEFT JOIN users u ON ux.user_id = u.id
         ORDER BY ux.total_xp DESC
         LIMIT $1`,
        [parseInt(limit)]
      );
    } else if (type === 'level') {
      result = await pool.query(
        `SELECT ul.*, u.username, u.avatar_url
         FROM user_levels ul
         LEFT JOIN users u ON ul.user_id = u.id
         ORDER BY ul.level DESC, ul.leveled_up_at ASC
         LIMIT $1`,
        [parseInt(limit)]
      );
    } else if (type === 'achievements') {
      result = await pool.query(
        `SELECT u.username, u.avatar_url, COUNT(ua.id) as achievement_count
         FROM users u
         LEFT JOIN user_achievements ua ON u.id = ua.user_id
         GROUP BY u.id, u.username, u.avatar_url
         ORDER BY achievement_count DESC
         LIMIT $1`,
        [parseInt(limit)]
      );
    }

    res.json({ leaderboard: result.rows, type });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get XP history
router.get('/xp/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM xp_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, parseInt(limit)]
    );

    res.json({ history: result.rows });
  } catch (error) {
    console.error('Get XP history error:', error);
    res.status(500).json({ error: 'Failed to get XP history' });
  }
});

// Helper functions
const calculateLevel = (totalXp) => {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
};

const getXpForLevel = (level) => {
  return Math.pow(level - 1, 2) * 100;
};

export default router;
