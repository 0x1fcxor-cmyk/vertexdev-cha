import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Track analytics event
router.post('/track', async (req, res) => {
  try {
    const { eventType, eventData, serverId } = req.body;
    const userId = req.headers['x-user-id'];

    if (!eventType) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    const pool = getPool();

    await pool.query(
      `INSERT INTO analytics_events (id, user_id, server_id, event_type, event_data, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [userId, serverId || null, eventType, JSON.stringify(eventData || {})]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get server analytics
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { period = '7d' } = req.query;
    const pool = getPool();

    // Calculate date range
    const periodDays = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 7;
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Get event counts by type
    const eventsResult = await pool.query(
      `SELECT event_type, COUNT(*) as count
       FROM analytics_events
       WHERE server_id = $1 AND created_at >= $2
       GROUP BY event_type
       ORDER BY count DESC`,
      [serverId, startDate]
    );

    // Get active users
    const activeUsersResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM analytics_events
       WHERE server_id = $1 AND created_at >= $2`,
      [serverId, startDate]
    );

    // Get message activity
    const messagesResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE channel_id IN (SELECT id FROM channels WHERE server_id = $1)
       AND created_at >= $2`,
      [serverId, startDate]
    );

    // Get member growth
    const memberGrowthResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE created_at >= $2) as new_members,
        COUNT(*) as total_members
       FROM server_members
       WHERE server_id = $1`,
      [serverId, startDate]
    );

    res.json({
      events: eventsResult.rows,
      activeUsers: parseInt(activeUsersResult.rows[0].count || 0),
      messageCount: parseInt(messagesResult.rows[0].count || 0),
      memberGrowth: {
        new: parseInt(memberGrowthResult.rows[0].new_members || 0),
        total: parseInt(memberGrowthResult.rows[0].total_members || 0)
      },
      period
    });
  } catch (error) {
    console.error('Get server analytics error:', error);
    res.status(500).json({ error: 'Failed to get server analytics' });
  }
});

// Get user analytics
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '7d' } = req.query;
    const pool = getPool();

    const periodDays = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 7;
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Get event counts
    const eventsResult = await pool.query(
      `SELECT event_type, COUNT(*) as count
       FROM analytics_events
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY event_type
       ORDER BY count DESC`,
      [userId, startDate]
    );

    // Get message count
    const messagesResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE user_id = $1 AND created_at >= $2`,
      [userId, startDate]
    );

    // Get server count
    const serversResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM server_members
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      events: eventsResult.rows,
      messageCount: parseInt(messagesResult.rows[0].count || 0),
      serverCount: parseInt(serversResult.rows[0].count || 0),
      period
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({ error: 'Failed to get user analytics' });
  }
});

// Get global analytics (admin only)
router.get('/global', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const pool = getPool();

    const periodDays = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 7;
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Get total users
    const usersResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE created_at >= $1) as new_users,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE status = 'online') as online_users
       FROM users`,
      [startDate]
    );

    // Get total servers
    const serversResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE created_at >= $1) as new_servers,
        COUNT(*) as total_servers
       FROM servers`,
      [startDate]
    );

    // Get total messages
    const messagesResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE created_at >= $1`,
      [startDate]
    );

    // Get event distribution
    const eventsResult = await pool.query(
      `SELECT event_type, COUNT(*) as count
       FROM analytics_events
       WHERE created_at >= $1
       GROUP BY event_type
       ORDER BY count DESC
       LIMIT 10`,
      [startDate]
    );

    res.json({
      users: usersResult.rows[0],
      servers: serversResult.rows[0],
      messageCount: parseInt(messagesResult.rows[0].count || 0),
      topEvents: eventsResult.rows,
      period
    });
  } catch (error) {
    console.error('Get global analytics error:', error);
    res.status(500).json({ error: 'Failed to get global analytics' });
  }
});

export default router;
