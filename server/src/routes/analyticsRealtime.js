import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get real-time server activity
router.get('/server/:serverId/activity', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { timeframe = '1h' } = req.query;
    const pool = getPool();

    const timeframes = {
      '1h': '1 hour',
      '6h': '6 hours',
      '24h': '1 day',
      '7d': '7 days'
    };

    const interval = timeframes[timeframe] || '1 hour';

    // Get message activity
    const messagesResult = await pool.query(
      `SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as count
       FROM messages m
       JOIN channels c ON m.channel_id = c.id
       WHERE c.server_id = $1
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${interval}'
       GROUP BY hour
       ORDER BY hour`,
      [serverId]
    );

    // Get user activity (online users over time)
    const usersResult = await pool.query(
      `SELECT 
        DATE_TRUNC('hour', last_seen) as hour,
        COUNT(*) as count
       FROM users
       WHERE id IN (SELECT user_id FROM server_members WHERE server_id = $1)
       AND last_seen >= CURRENT_TIMESTAMP - INTERVAL '${interval}'
       GROUP BY hour
       ORDER BY hour`,
      [serverId]
    );

    // Get current online users
    const onlineResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM users
       WHERE status = 'online'
       AND id IN (SELECT user_id FROM server_members WHERE server_id = $1)`,
      [serverId]
    );

    // Get voice channel activity
    const voiceResult = await pool.query(
      `SELECT 
        c.name as channel_name,
        COUNT(vs.user_id) as user_count
       FROM voice_states vs
       JOIN channels c ON vs.channel_id = c.id
       WHERE c.server_id = $1
       GROUP BY c.id, c.name`,
      [serverId]
    );

    res.json({
      messages: messagesResult.rows,
      users: usersResult.rows,
      currentOnline: parseInt(onlineResult.rows[0]?.count || 0),
      voiceChannels: voiceResult.rows,
      timeframe
    });
  } catch (error) {
    console.error('Get real-time activity error:', error);
    res.status(500).json({ error: 'Failed to get real-time activity' });
  }
});

// Get user engagement heatmap
router.get('/server/:serverId/heatmap', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { period = '7d' } = req.query;
    const pool = getPool();

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 7;

    const result = await pool.query(
      `SELECT 
        EXTRACT(DOW FROM created_at) as day_of_week,
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as message_count
       FROM messages m
       JOIN channels c ON m.channel_id = c.id
       WHERE c.server_id = $1
       AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY day_of_week, hour
       ORDER BY day_of_week, hour`,
      [serverId]
    );

    // Transform into 7x24 grid
    const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));
    
    result.rows.forEach(row => {
      const day = parseInt(row.day_of_week);
      const hour = parseInt(row.hour);
      if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
        heatmap[day][hour] = parseInt(row.message_count);
      }
    });

    res.json({ heatmap, period });
  } catch (error) {
    console.error('Get heatmap error:', error);
    res.status(500).json({ error: 'Failed to get heatmap' });
  }
});

// Get user behavior analysis
router.get('/server/:serverId/behavior', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    // Top message senders
    const topSendersResult = await pool.query(
      `SELECT 
        u.username,
        u.avatar_url,
        COUNT(m.id) as message_count,
        AVG(LENGTH(m.content)) as avg_message_length
       FROM messages m
       JOIN users u ON m.user_id = u.id
       JOIN channels c ON m.channel_id = c.id
       WHERE c.server_id = $1
       AND m.created_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY u.id, u.username, u.avatar_url
       ORDER BY message_count DESC
       LIMIT 10`,
      [serverId]
    );

    // Most active channels
    const activeChannelsResult = await pool.query(
      `SELECT 
        c.name,
        COUNT(m.id) as message_count,
        COUNT(DISTINCT m.user_id) as unique_users
       FROM messages m
       JOIN channels c ON m.channel_id = c.id
       WHERE c.server_id = $1
       AND m.created_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY c.id, c.name
       ORDER BY message_count DESC
       LIMIT 10`,
      [serverId]
    );

    // Peak activity times
    const peakTimesResult = await pool.query(
      `SELECT 
        EXTRACT(DOW FROM created_at) as day,
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
       FROM messages m
       JOIN channels c ON m.channel_id = c.id
       WHERE c.server_id = $1
       AND m.created_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY day, hour
       ORDER BY count DESC
       LIMIT 5`,
      [serverId]
    );

    // User retention (users who joined and are still active)
    const retentionResult = await pool.query(
      `SELECT 
        COUNT(*) as total_members,
        COUNT(*) FILTER (WHERE u.last_seen >= CURRENT_DATE - INTERVAL '7 days') as active_members,
        COUNT(*) FILTER (WHERE u.last_seen >= CURRENT_DATE - INTERVAL '30 days') as monthly_active
       FROM server_members sm
       JOIN users u ON sm.user_id = u.id
       WHERE sm.server_id = $1`,
      [serverId]
    );

    res.json({
      topSenders: topSendersResult.rows,
      activeChannels: activeChannelsResult.rows,
      peakTimes: peakTimesResult.rows,
      retention: retentionResult.rows[0]
    });
  } catch (error) {
    console.error('Get behavior analysis error:', error);
    res.status(500).json({ error: 'Failed to get behavior analysis' });
  }
});

// Get channel comparison metrics
router.get('/server/:serverId/channels/compare', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.type,
        COUNT(m.id) as total_messages,
        COUNT(DISTINCT m.user_id) as unique_contributors,
        AVG(LENGTH(m.content)) as avg_message_length,
        MAX(m.created_at) as last_activity,
        COUNT(DISTINCT CASE WHEN m.created_at >= CURRENT_DATE - INTERVAL '1 day' THEN m.user_id END) as daily_active_users
       FROM channels c
       LEFT JOIN messages m ON c.id = m.channel_id
       WHERE c.server_id = $1
       GROUP BY c.id, c.name, c.type
       ORDER BY total_messages DESC`,
      [serverId]
    );

    res.json({ channels: result.rows });
  } catch (error) {
    console.error('Get channel comparison error:', error);
    res.status(500).json({ error: 'Failed to get channel comparison' });
  }
});

export default router;
