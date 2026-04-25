import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Send friend request
router.post('/request', async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    if (userId === friendId) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    // Check if already friends
    const existing = await pool.query(
      `SELECT * FROM friends 
       WHERE (user_id = $1 AND friend_id = $2) 
       OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already friends or request pending' });
    }

    // Create friend request
    await pool.query(
      `INSERT INTO friends (id, user_id, friend_id, status, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'pending', CURRENT_TIMESTAMP)`,
      [userId, friendId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept friend request
router.post('/:friendId/accept', async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Update friend request to accepted
    await pool.query(
      `UPDATE friends 
       SET status = 'accepted' 
       WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
      [friendId, userId]
    );

    // Create reciprocal friendship
    await pool.query(
      `INSERT INTO friends (id, user_id, friend_id, status, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'accepted', CURRENT_TIMESTAMP)`,
      [userId, friendId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Decline friend request
router.post('/:friendId/decline', async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `DELETE FROM friends 
       WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
      [friendId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Decline friend request error:', error);
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

// Get friends
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { status = 'accepted' } = req.query;
    const pool = getPool();

    const result = await pool.query(
      `SELECT f.*, u.username, u.avatar_url, u.status as user_status
       FROM friends f
       LEFT JOIN users u ON (f.friend_id = u.id)
       WHERE f.user_id = $1 AND f.status = $2
       ORDER BY f.created_at DESC`,
      [userId, status]
    );

    res.json({ friends: result.rows });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

// Get pending friend requests
router.get('/pending', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT f.*, u.username, u.avatar_url
       FROM friends f
       LEFT JOIN users u ON (f.user_id = u.id)
       WHERE f.friend_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
});

// Remove friend
router.delete('/:friendId', async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `DELETE FROM friends 
       WHERE (user_id = $1 AND friend_id = $2) 
       OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Block user
router.post('/:friendId/block', async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Delete any existing friendship
    await pool.query(
      `DELETE FROM friends 
       WHERE (user_id = $1 AND friend_id = $2) 
       OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );

    // Create block entry
    await pool.query(
      `INSERT INTO friends (id, user_id, friend_id, status, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'blocked', CURRENT_TIMESTAMP)`,
      [userId, friendId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Get blocked users
router.get('/blocked', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT f.*, u.username, u.avatar_url
       FROM friends f
       LEFT JOIN users u ON (f.friend_id = u.id)
       WHERE f.user_id = $1 AND f.status = 'blocked'`,
      [userId]
    );

    res.json({ blocked: result.rows });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ error: 'Failed to get blocked users' });
  }
});

export default router;
