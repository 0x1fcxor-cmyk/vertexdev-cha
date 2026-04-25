import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get user's full customization profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT 
        u.*,
        (SELECT COUNT(*) FROM custom_emojis WHERE user_id = $1) as emoji_count,
        (SELECT COUNT(*) FROM custom_stickers WHERE user_id = $1) as sticker_count,
        (SELECT COUNT(*) FROM profile_badges WHERE user_id = $1) as badge_count
       FROM users u
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      profile: {
        username: user.username,
        avatarUrl: user.avatar_url,
        bannerUrl: user.banner_url,
        bio: user.bio,
        status: user.status,
        activityType: user.activity_type,
        activityName: user.activity_name
      },
      appearance: {
        theme: user.theme,
        fontSize: user.font_size,
        highContrast: user.high_contrast,
        screenReader: user.screen_reader,
        reducedMotion: user.reduced_motion,
        customCss: user.custom_css,
        profileTheme: user.profile_theme,
        avatarFrame: user.avatar_frame,
        profileAnimation: user.profile_animation,
        profileBackground: user.profile_background
      },
      voice: {
        noiseCancellation: user.noise_cancellation,
        noiseSuppressionLevel: user.noise_suppression_level,
        echoCancellation: user.echo_cancellation,
        autoGain: user.auto_gain,
        autoGainLevel: user.auto_gain_level,
        voiceIsolation: user.voice_isolation,
        voiceActivityDetection: user.voice_activity_detection
      },
      stats: {
        emojiCount: user.emoji_count,
        stickerCount: user.sticker_count,
        badgeCount: user.badge_count
      }
    });
  } catch (error) {
    console.error('Get customization profile error:', error);
    res.status(500).json({ error: 'Failed to get customization profile' });
  }
});

// Update user's appearance customization
router.put('/appearance', async (req, res) => {
  try {
    const { 
      theme, 
      fontSize, 
      highContrast, 
      screenReader, 
      reducedMotion,
      customCss,
      profileTheme,
      avatarFrame,
      profileAnimation,
      profileBackground
    } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (theme !== undefined) {
      updates.push(`theme = $${paramIndex++}`);
      params.push(theme);
    }
    if (fontSize !== undefined) {
      updates.push(`font_size = $${paramIndex++}`);
      params.push(fontSize);
    }
    if (highContrast !== undefined) {
      updates.push(`high_contrast = $${paramIndex++}`);
      params.push(highContrast);
    }
    if (screenReader !== undefined) {
      updates.push(`screen_reader = $${paramIndex++}`);
      params.push(screenReader);
    }
    if (reducedMotion !== undefined) {
      updates.push(`reduced_motion = $${paramIndex++}`);
      params.push(reducedMotion);
    }
    if (customCss !== undefined) {
      updates.push(`custom_css = $${paramIndex++}`);
      params.push(customCss);
    }
    if (profileTheme !== undefined) {
      updates.push(`profile_theme = $${paramIndex++}`);
      params.push(profileTheme);
    }
    if (avatarFrame !== undefined) {
      updates.push(`avatar_frame = $${paramIndex++}`);
      params.push(avatarFrame);
    }
    if (profileAnimation !== undefined) {
      updates.push(`profile_animation = $${paramIndex++}`);
      params.push(profileAnimation);
    }
    if (profileBackground !== undefined) {
      updates.push(`profile_background = $${paramIndex++}`);
      params.push(profileBackground);
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
    console.error('Update appearance error:', error);
    res.status(500).json({ error: 'Failed to update appearance' });
  }
});

// Create custom emoji
router.post('/emojis', async (req, res) => {
  try {
    const { name, imageUrl, animated } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const emojiId = uuidv4();

    await pool.query(
      `INSERT INTO custom_emojis (id, user_id, name, image_url, animated, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [emojiId, userId, name, imageUrl, animated || false]
    );

    const result = await pool.query(
      'SELECT * FROM custom_emojis WHERE id = $1',
      [emojiId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create emoji error:', error);
    res.status(500).json({ error: 'Failed to create emoji' });
  }
});

// Get user's custom emojis
router.get('/emojis', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM custom_emojis WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ emojis: result.rows });
  } catch (error) {
    console.error('Get emojis error:', error);
    res.status(500).json({ error: 'Failed to get emojis' });
  }
});

// Create custom sticker
router.post('/stickers', async (req, res) => {
  try {
    const { name, imageUrl, tags, animated } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const stickerId = uuidv4();

    await pool.query(
      `INSERT INTO custom_stickers (id, user_id, name, image_url, tags, animated, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [stickerId, userId, name, imageUrl, tags || [], animated || false]
    );

    const result = await pool.query(
      'SELECT * FROM custom_stickers WHERE id = $1',
      [stickerId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create sticker error:', error);
    res.status(500).json({ error: 'Failed to create sticker' });
  }
});

// Get user's custom stickers
router.get('/stickers', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM custom_stickers WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ stickers: result.rows });
  } catch (error) {
    console.error('Get stickers error:', error);
    res.status(500).json({ error: 'Failed to get stickers' });
  }
});

// Add profile badge
router.post('/badges', async (req, res) => {
  try {
    const { badgeType, badgeId, customIcon, customColor } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const profileBadgeId = uuidv4();

    await pool.query(
      `INSERT INTO profile_badges (id, user_id, badge_type, badge_id, custom_icon, custom_color, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [profileBadgeId, userId, badgeType, badgeId, customIcon, customColor]
    );

    res.status(201).json({ success: true, id: profileBadgeId });
  } catch (error) {
    console.error('Add badge error:', error);
    res.status(500).json({ error: 'Failed to add badge' });
  }
});

// Get user's badges
router.get('/badges', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM profile_badges WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ badges: result.rows });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({ error: 'Failed to get badges' });
  }
});

// Create custom sound
router.post('/sounds', async (req, res) => {
  try {
    const { name, soundUrl, soundType, volume } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const soundId = uuidv4();

    await pool.query(
      `INSERT INTO custom_sounds (id, user_id, name, sound_url, sound_type, volume, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [soundId, userId, name, soundUrl, soundType, volume || 1.0]
    );

    res.status(201).json({ success: true, id: soundId });
  } catch (error) {
    console.error('Create sound error:', error);
    res.status(500).json({ error: 'Failed to create sound' });
  }
});

// Get user's custom sounds
router.get('/sounds', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM custom_sounds WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ sounds: result.rows });
  } catch (error) {
    console.error('Get sounds error:', error);
    res.status(500).json({ error: 'Failed to get sounds' });
  }
});

// Update notification sound settings
router.put('/notification-sounds', async (req, res) => {
  try {
    const { messageSound, mentionSound, callSound, friendRequestSound } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `UPDATE users 
       SET notification_sound_message = $1,
           notification_sound_mention = $2,
           notification_sound_call = $3,
           notification_sound_friend_request = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [messageSound, mentionSound, callSound, friendRequestSound, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update notification sounds error:', error);
    res.status(500).json({ error: 'Failed to update notification sounds' });
  }
});

// Create custom theme
router.post('/themes', async (req, res) => {
  try {
    const { name, colors, fonts, cssVariables } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const themeId = uuidv4();

    await pool.query(
      `INSERT INTO custom_themes (id, user_id, name, colors, fonts, css_variables, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [themeId, userId, name, colors, fonts, cssVariables]
    );

    res.status(201).json({ success: true, id: themeId });
  } catch (error) {
    console.error('Create theme error:', error);
    res.status(500).json({ error: 'Failed to create theme' });
  }
});

// Get user's custom themes
router.get('/themes', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM custom_themes WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ themes: result.rows });
  } catch (error) {
    console.error('Get themes error:', error);
    res.status(500).json({ error: 'Failed to get themes' });
  }
});

// Update keyboard shortcuts
router.put('/shortcuts', async (req, res) => {
  try {
    const { shortcuts } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `UPDATE users 
       SET custom_shortcuts = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [JSON.stringify(shortcuts), userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update shortcuts error:', error);
    res.status(500).json({ error: 'Failed to update shortcuts' });
  }
});

// Get available customization options
router.get('/options', (req, res) => {
  const options = {
    themes: [
      { id: 'dark', name: 'Dark', default: true },
      { id: 'light', name: 'Light' },
      { id: 'midnight', name: 'Midnight' },
      { id: 'sunset', name: 'Sunset' },
      { id: 'ocean', name: 'Ocean' },
      { id: 'forest', name: 'Forest' },
      { id: 'cyberpunk', name: 'Cyberpunk' },
      { id: 'pastel', name: 'Pastel' }
    ],
    profileThemes: [
      { id: 'default', name: 'Default' },
      { id: 'gradient-blue', name: 'Blue Gradient' },
      { id: 'gradient-purple', name: 'Purple Gradient' },
      { id: 'gradient-sunset', name: 'Sunset Gradient' },
      { id: 'animated-stars', name: 'Animated Stars' },
      { id: 'animated-waves', name: 'Animated Waves' }
    ],
    avatarFrames: [
      { id: 'none', name: 'None' },
      { id: 'gold', name: 'Gold' },
      { id: 'silver', name: 'Silver' },
      { id: 'rainbow', name: 'Rainbow' },
      { id: 'neon', name: 'Neon' },
      { id: 'glitch', name: 'Glitch' }
    ],
    profileAnimations: [
      { id: 'none', name: 'None' },
      { id: 'bounce', name: 'Bounce' },
      { id: 'pulse', name: 'Pulse' },
      { id: 'spin', name: 'Spin' },
      { id: 'float', name: 'Float' },
      { id: 'glow', name: 'Glow' }
    ],
    badgeTypes: [
      { id: 'early-adopter', name: 'Early Adopter' },
      { id: 'premium', name: 'Premium' },
      { id: 'moderator', name: 'Moderator' },
      { id: 'developer', name: 'Developer' },
      { id: 'artist', name: 'Artist' },
      { id: 'musician', name: 'Musician' },
      { id: 'gamer', name: 'Gamer' },
      { id: 'custom', name: 'Custom' }
    ],
    soundTypes: [
      { id: 'notification', name: 'Notification' },
      { id: 'message', name: 'Message' },
      { id: 'mention', name: 'Mention' },
      { id: 'call', name: 'Call' },
      { id: 'friend-request', name: 'Friend Request' }
    ],
    fontSizes: [
      { id: 'small', name: 'Small', scale: 0.85 },
      { id: 'medium', name: 'Medium', scale: 1.0 },
      { id: 'large', name: 'Large', scale: 1.15 },
      { id: 'extra-large', name: 'Extra Large', scale: 1.3 }
    ]
  };

  res.json(options);
});

export default router;
