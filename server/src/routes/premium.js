import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get user's premium subscription
router.get('/subscription', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT * FROM premium_subscriptions 
       WHERE user_id = $1 AND status = 'active' 
       ORDER BY expires_at DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ plan: null, features: [] });
    }

    const subscription = result.rows[0];

    // Determine features based on plan
    const features = [];
    switch (subscription.plan) {
      case 'basic':
        features.push('custom_emoji', 'server_boost_1', 'higher_upload_limit');
        break;
      case 'pro':
        features.push('custom_emoji', 'server_boost_2', 'higher_upload_limit', 'animated_emoji', 'profile_banner');
        break;
      case 'enterprise':
        features.push('custom_emoji', 'server_boost_3', 'unlimited_upload_limit', 'animated_emoji', 'profile_banner', 'custom_theme', 'priority_support');
        break;
    }

    res.json({ plan: subscription.plan, features, expiresAt: subscription.expires_at });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Create premium subscription
router.post('/subscribe', async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.headers['x-user-id'];

    if (!plan || !['basic', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const pool = getPool();
    const subscriptionId = uuidv4();

    // Calculate expiration based on plan
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month for now

    await pool.query(
      `INSERT INTO premium_subscriptions (id, user_id, plan, status, started_at, expires_at, auto_renew)
       VALUES ($1, $2, $3, 'active', CURRENT_TIMESTAMP, $4, FALSE)`,
      [subscriptionId, userId, plan, expiresAt]
    );

    const result = await pool.query(
      'SELECT * FROM premium_subscriptions WHERE id = $1',
      [subscriptionId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Cancel subscription
router.post('/cancel', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `UPDATE premium_subscriptions 
       SET status = 'cancelled' 
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Boost server
router.post('/boost', async (req, res) => {
  try {
    const { serverId } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user has premium
    const subscriptionResult = await pool.query(
      `SELECT * FROM premium_subscriptions 
       WHERE user_id = $1 AND status = 'active' AND expires_at > CURRENT_TIMESTAMP`,
      [userId]
    );

    if (subscriptionResult.rows.length === 0) {
      return res.status(403).json({ error: 'Premium subscription required' });
    }

    const subscription = subscriptionResult.rows[0];

    // Check max boosts based on plan
    const maxBoosts = subscription.plan === 'basic' ? 1 : subscription.plan === 'pro' ? 2 : 3;

    const currentBoosts = await pool.query(
      'SELECT COUNT(*) as count FROM server_boosts WHERE user_id = $1',
      [userId]
    );

    if (parseInt(currentBoosts.rows[0].count) >= maxBoosts) {
      return res.status(400).json({ error: 'Maximum boost limit reached' });
    }

    // Check if already boosted this server
    const existingBoost = await pool.query(
      'SELECT * FROM server_boosts WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );

    if (existingBoost.rows.length > 0) {
      // Increase boost count
      await pool.query(
        'UPDATE server_boosts SET boost_count = boost_count + 1 WHERE id = $1',
        [existingBoost.rows[0].id]
      );
    } else {
      // Create new boost
      await pool.query(
        `INSERT INTO server_boosts (id, server_id, user_id, boost_count, boosted_at)
         VALUES (gen_random_uuid(), $1, $2, 1, CURRENT_TIMESTAMP)`,
        [serverId, userId]
      );
    }

    // Get total boosts for server
    const totalBoostsResult = await pool.query(
      'SELECT SUM(boost_count) as total FROM server_boosts WHERE server_id = $1',
      [serverId]
    );

    const totalBoosts = parseInt(totalBoostsResult.rows[0].total || 0);

    res.json({ success: true, totalBoosts });
  } catch (error) {
    console.error('Boost server error:', error);
    res.status(500).json({ error: 'Failed to boost server' });
  }
});

// Get server boost level
router.get('/boost/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT SUM(boost_count) as total FROM server_boosts WHERE server_id = $1',
      [serverId]
    );

    const totalBoosts = parseInt(result.rows[0].total || 0);

    // Calculate boost level (every 3 boosts = 1 level)
    const level = Math.floor(totalBoosts / 3) + 1;

    // Determine perks based on level
    const perks = [];
    if (level >= 1) perks.push('higher_audio_quality', 'larger_upload_limit');
    if (level >= 2) perks.push('custom_server_icon', 'animated_server_icon');
    if (level >= 3) perks.push('banner_background', 'more_emoji_slots');
    if (level >= 4) perks.push('vanity_url', 'invite_splash');

    res.json({ level, totalBoosts, perks });
  } catch (error) {
    console.error('Get boost level error:', error);
    res.status(500).json({ error: 'Failed to get boost level' });
  }
});

// Get user's boosts
router.get('/boosts', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT sb.*, s.name as server_name, s.icon_url as server_icon
       FROM server_boosts sb
       LEFT JOIN servers s ON sb.server_id = s.id
       WHERE sb.user_id = $1`,
      [userId]
    );

    res.json({ boosts: result.rows });
  } catch (error) {
    console.error('Get boosts error:', error);
    res.status(500).json({ error: 'Failed to get boosts' });
  }
});

export default router;
