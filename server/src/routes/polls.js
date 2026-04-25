import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create poll
router.post('/', async (req, res) => {
  try {
    const { channelId, question, options, duration, multipleChoice, anonymous } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const pollId = uuidv4();

    await pool.query(
      `INSERT INTO polls (id, channel_id, user_id, question, options, duration, multiple_choice, anonymous, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', CURRENT_TIMESTAMP)`,
      [pollId, channelId, userId, question, options, duration, multipleChoice || false, anonymous || false]
    );

    const result = await pool.query(
      'SELECT * FROM polls WHERE id = $1',
      [pollId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// Get poll
router.get('/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;
    const pool = getPool();

    const pollResult = await pool.query(
      'SELECT * FROM polls WHERE id = $1',
      [pollId]
    );

    if (pollResult.rows.length === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const poll = pollResult.rows[0];

    // Get vote counts
    const votesResult = await pool.query(
      `SELECT option_index, COUNT(*) as count 
       FROM poll_votes 
       WHERE poll_id = $1 
       GROUP BY option_index`,
      [pollId]
    );

    const voteCounts = {};
    votesResult.rows.forEach(row => {
      voteCounts[row.option_index] = parseInt(row.count);
    });

    res.json({ ...poll, voteCounts });
  } catch (error) {
    console.error('Get poll error:', error);
    res.status(500).json({ error: 'Failed to get poll' });
  }
});

// Vote on poll
router.post('/:pollId/vote', async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionIndices } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Get poll details
    const pollResult = await pool.query(
      'SELECT * FROM polls WHERE id = $1',
      [pollId]
    );

    if (pollResult.rows.length === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const poll = pollResult.rows[0];

    // Check if poll is still active
    if (poll.status !== 'active') {
      return res.status(400).json({ error: 'Poll is not active' });
    }

    // Check if poll has expired
    if (poll.expires_at && new Date() > new Date(poll.expires_at)) {
      return res.status(400).json({ error: 'Poll has expired' });
    }

    // Check if user already voted (if not multiple choice)
    if (!poll.multiple_choice) {
      const existingVote = await pool.query(
        'SELECT * FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
        [pollId, userId]
      );

      if (existingVote.rows.length > 0) {
        return res.status(400).json({ error: 'You have already voted on this poll' });
      }
    }

    // Remove existing votes if changing vote
    await pool.query(
      'DELETE FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
      [pollId, userId]
    );

    // Add votes
    for (const optionIndex of optionIndices) {
      await pool.query(
        `INSERT INTO poll_votes (poll_id, user_id, option_index, voted_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [pollId, userId, optionIndex]
      );
    }

    // Emit via Socket.io
    const io = req.app.get('io');
    io.to(`poll:${pollId}`).emit('poll:vote', { pollId, userId, optionIndices });

    res.json({ success: true });
  } catch (error) {
    console.error('Vote on poll error:', error);
    res.status(500).json({ error: 'Failed to vote on poll' });
  }
});

// End poll
router.post('/:pollId/end', async (req, res) => {
  try {
    const { pollId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const pollResult = await pool.query(
      'SELECT * FROM polls WHERE id = $1 AND user_id = $2',
      [pollId, userId]
    );

    if (pollResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to end this poll' });
    }

    await pool.query(
      'UPDATE polls SET status = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['ended', pollId]
    );

    // Emit via Socket.io
    const io = req.app.get('io');
    io.to(`poll:${pollId}`).emit('poll:ended', { pollId });

    res.json({ success: true });
  } catch (error) {
    console.error('End poll error:', error);
    res.status(500).json({ error: 'Failed to end poll' });
  }
});

// Get polls for channel
router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { status } = req.query;
    const pool = getPool();

    let sql = 'SELECT * FROM polls WHERE channel_id = $1';
    const params = [channelId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await pool.query(sql, params);

    res.json({ polls: result.rows });
  } catch (error) {
    console.error('Get channel polls error:', error);
    res.status(500).json({ error: 'Failed to get channel polls' });
  }
});

// Delete poll
router.delete('/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const pollResult = await pool.query(
      'SELECT * FROM polls WHERE id = $1 AND user_id = $2',
      [pollId, userId]
    );

    if (pollResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this poll' });
    }

    await pool.query('DELETE FROM polls WHERE id = $1', [pollId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete poll error:', error);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

export default router;
