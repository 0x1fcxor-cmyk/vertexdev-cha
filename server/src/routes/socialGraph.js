import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get user's social graph
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    // Get direct friends
    const friendsResult = await pool.query(
      `SELECT 
        CASE 
          WHEN f.user_id = $1 THEN f.friend_id
          ELSE f.user_id
        END as friend_id,
        u.username,
        u.avatar_url,
        f.status
       FROM friends f
       LEFT JOIN users u ON (CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END) = u.id
       WHERE (f.user_id = $1 OR f.friend_id = $1)
       AND f.status = 'accepted'`,
      [userId]
    );

    // Get mutual friends (friends of friends)
    const friendIds = friendsResult.rows.map(f => f.friend_id);
    const mutualFriends = [];

    for (const friend of friendsResult.rows) {
      const friendFriendsResult = await pool.query(
        `SELECT 
          CASE 
            WHEN f.user_id = $1 THEN f.friend_id
            ELSE f.user_id
          END as mutual_friend_id,
          u.username
         FROM friends f
         LEFT JOIN users u ON (CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END) = u.id
         WHERE (f.user_id = $1 OR f.friend_id = $1)
         AND f.status = 'accepted'
         AND (CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END) != $2`,
        [friend.friend_id, userId]
      );

      mutualFriends.push({
        friendId: friend.friend_id,
        mutualWith: friendFriendsResult.rows.map(f => ({ id: f.mutual_friend_id, username: f.username }))
      });
    }

    // Get servers in common
    const serversResult = await pool.query(
      `SELECT DISTINCT s.id, s.name, s.icon_url
       FROM servers s
       JOIN server_members sm1 ON s.id = sm1.server_id
       JOIN server_members sm2 ON s.id = sm2.server_id
       WHERE sm1.user_id = $1
       AND sm2.user_id != $1
       AND sm2.user_id = ANY($2)
       LIMIT 20`,
      [userId, friendIds]
    );

    res.json({
      directFriends: friendsResult.rows,
      mutualConnections: mutualFriends,
      serversInCommon: serversResult.rows
    });
  } catch (error) {
    console.error('Get social graph error:', error);
    res.status(500).json({ error: 'Failed to get social graph' });
  }
});

// Get friend recommendations
router.get('/user/:userId/recommendations', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    const pool = getPool();

    const recommendations = [];

    // Recommendation 1: Friends of friends (mutual connections)
    const friendsResult = await pool.query(
      `SELECT friend_id
       FROM friends
       WHERE user_id = $1 AND status = 'accepted'`,
      [userId]
    );

    const friendIds = friendsResult.rows.map(f => f.friend_id);

    if (friendIds.length > 0) {
      const friendsOfFriendsResult = await pool.query(
        `SELECT 
          u.id,
          u.username,
          u.avatar_url,
          COUNT(*) as mutual_count
         FROM friends f
         JOIN users u ON (CASE WHEN f.user_id = ANY($2) THEN f.friend_id ELSE f.user_id END) = u.id
         WHERE (f.user_id = ANY($2) OR f.friend_id = ANY($2))
         AND f.status = 'accepted'
         AND u.id != $1
         AND u.id NOT IN (SELECT friend_id FROM friends WHERE user_id = $1)
         GROUP BY u.id, u.username, u.avatar_url
         ORDER BY mutual_count DESC
         LIMIT $3`,
        [userId, friendIds, limit]
      );

      recommendations.push({
        type: 'mutual_friends',
        reason: 'Friends of friends',
        users: friendsOfFriendsResult.rows
      });
    }

    // Recommendation 2: People in same servers
    const serverMembersResult = await pool.query(
      `SELECT 
        u.id,
        u.username,
        u.avatar_url,
        COUNT(DISTINCT sm.server_id) as shared_servers
       FROM server_members sm1
       JOIN server_members sm2 ON sm1.server_id = sm2.server_id
       JOIN users u ON sm2.user_id = u.id
       WHERE sm1.user_id = $1
       AND sm2.user_id != $1
       AND sm2.user_id NOT IN (SELECT friend_id FROM friends WHERE user_id = $1)
       GROUP BY u.id, u.username, u.avatar_url
       ORDER BY shared_servers DESC
       LIMIT $2`,
      [userId, limit]
    );

    recommendations.push({
      type: 'shared_servers',
      reason: 'People in your servers',
      users: serverMembersResult.rows
    });

    // Recommendation 3: Similar users (based on activity patterns)
    const similarUsersResult = await pool.query(
      `SELECT 
        u.id,
        u.username,
        u.avatar_url
       FROM users u
       WHERE u.id != $1
       AND u.id NOT IN (SELECT friend_id FROM friends WHERE user_id = $1)
       ORDER BY RANDOM()
       LIMIT $2`,
      [userId, Math.max(5, limit - 10)]
    });

    if (similarUsersResult.rows.length > 0) {
      recommendations.push({
        type: 'discovery',
        reason: 'Discover new people',
        users: similarUsersResult.rows
      });
    }

    res.json({ recommendations });
  } catch (error) {
    console.error('Get friend recommendations error:', error);
    res.status(500).json({ error: 'Failed to get friend recommendations' });
  }
});

// Get influence score (social influence metric)
router.get('/user/:userId/influence', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    // Calculate influence based on:
    // 1. Number of friends
    const friendsCountResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM friends
       WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'`,
      [userId]
    );

    // 2. Number of servers
    const serversCountResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM server_members
       WHERE user_id = $1`,
      [userId]
    );

    // 3. Message activity
    const messageCountResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE user_id = $1
       AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    );

    // 4. Engagement (reactions received)
    const reactionsReceivedResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM message_reactions
       WHERE message_id IN (SELECT id FROM messages WHERE user_id = $1)`,
      [userId]
    );

    const friendsCount = parseInt(friendsCountResult.rows[0].count);
    const serversCount = parseInt(serversCountResult.rows[0].count);
    const messageCount = parseInt(messageCountResult.rows[0].count);
    const reactionsReceived = parseInt(reactionsReceivedResult.rows[0].count);

    // Calculate weighted score
    const influenceScore = (
      (friendsCount * 10) +
      (serversCount * 5) +
      (messageCount * 0.1) +
      (reactionsReceived * 5)
    );

    const influenceLevel = influenceScore < 50 ? 'novice' : influenceScore < 200 ? 'regular' : influenceScore < 500 ? 'influencer' : 'celebrity';

    res.json({
      influenceScore: Math.round(influenceScore),
      influenceLevel,
      breakdown: {
        friends: friendsCount,
        servers: serversCount,
        messages: messageCount,
        reactionsReceived
      }
    });
  } catch (error) {
    console.error('Get influence score error:', error);
    res.status(500).json({ error: 'Failed to get influence score' });
  }
});

export default router;
