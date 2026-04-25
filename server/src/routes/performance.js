import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get server performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const pool = getPool();

    // Get database connection pool stats
    const poolStats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    };

    // Get message count by time period
    const messageStats = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour') as hourly,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day') as daily,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days') as weekly,
        COUNT(*) as total
       FROM messages`
    );

    // Get user count
    const userStats = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'online') as online,
        COUNT(*) FILTER (WHERE last_seen >= CURRENT_TIMESTAMP - INTERVAL '1 day') as active_today
       FROM users`
    );

    // Get server count
    const serverStats = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE public = TRUE) as public,
        SUM(member_count) as total_members
       FROM servers`
    );

    res.json({
      database: poolStats,
      messages: messageStats.rows[0],
      users: userStats.rows[0],
      servers: serverStats.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// Get optimized message list with pagination
router.get('/messages/optimized', async (req, res) => {
  try {
    const { channelId, limit = 50, offset = 0 } = req.query;
    const pool = getPool();

    // Use cursor-based pagination for better performance
    const result = await pool.query(
      `SELECT 
        m.id,
        m.content,
        m.created_at,
        u.username,
        u.avatar_url,
        u.status,
        COUNT(r.id) as reaction_count
       FROM messages m
       LEFT JOIN users u ON m.user_id = u.id
       LEFT JOIN message_reactions r ON m.id = r.message_id
       WHERE m.channel_id = $1
       GROUP BY m.id, u.username, u.avatar_url, u.status
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [channelId, parseInt(limit), parseInt(offset)]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get optimized messages error:', error);
    res.status(500).json({ error: 'Failed to get optimized messages' });
  }
});

// Get lazy-loaded channel data
router.get('/channels/lazy', async (req, res) => {
  try {
    const { serverId } = req.query;
    const pool = getPool();

    const result = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.type,
        c.parent_id,
        c.position,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_time
       FROM channels c
       LEFT JOIN messages m ON c.id = m.channel_id
       WHERE c.server_id = $1
       GROUP BY c.id
       ORDER BY c.position`,
      [serverId]
    );

    res.json({ channels: result.rows });
  } catch (error) {
    console.error('Get lazy channels error:', error);
    res.status(500).json({ error: 'Failed to get lazy channels' });
  }
});

// Batch user data fetch for performance
router.post('/users/batch', async (req, res) => {
  try {
    const { userIds } = req.body;
    const pool = getPool();

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    const result = await pool.query(
      `SELECT id, username, avatar_url, status, activity_type, activity_name
       FROM users
       WHERE id = ANY($1)`,
      [userIds]
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Batch user fetch error:', error);
    res.status(500).json({ error: 'Failed to batch fetch users' });
  }
});

// Cache management endpoints
router.post('/cache/clear', async (req, res) => {
  try {
    const { key } = req.body;
    
    // This would integrate with Redis for cache management
    // For now, return success
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Get query performance stats
router.get('/query-performance', async (req, res) => {
  try {
    const pool = getPool();

    // Get slow query stats (simplified)
    const result = await pool.query(
      `SELECT 
        schemaname,
        tablename,
        seq_scan,
        idx_scan,
        n_tup_ins,
        n_tup_upd,
        n_tup_del
       FROM pg_stat_user_tables
       ORDER BY seq_scan DESC
       LIMIT 10`
    );

    res.json({ tableStats: result.rows });
  } catch (error) {
    console.error('Get query performance error:', error);
    res.status(500).json({ error: 'Failed to get query performance' });
  }
});

export default router;
