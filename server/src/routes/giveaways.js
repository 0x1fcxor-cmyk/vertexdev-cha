import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create giveaway
router.post('/', async (req, res) => {
  try {
    const { serverId, channelId, prize, description, winnerCount, endTime, requirements, coverImage } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND (role = 'admin' OR role = 'moderator')`,
      [serverId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const giveawayId = uuidv4();

    await pool.query(
      `INSERT INTO giveaways (id, server_id, channel_id, prize, description, winner_count, end_time, requirements, cover_image, created_by, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', CURRENT_TIMESTAMP)`,
      [giveawayId, serverId, channelId, prize, description, winnerCount || 1, endTime, JSON.stringify(requirements || {}), coverImage, userId]
    );

    const result = await pool.query(
      'SELECT * FROM giveaways WHERE id = $1',
      [giveawayId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create giveaway error:', error);
    res.status(500).json({ error: 'Failed to create giveaway' });
  }
});

// Get giveaways for server
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { status } = req.query;
    const pool = getPool();

    let sql = `SELECT g.*, u.username as created_by_username 
               FROM giveaways g
               LEFT JOIN users u ON g.created_by = u.id
               WHERE g.server_id = $1`;
    const params = [serverId];

    if (status) {
      sql += ' AND g.status = $2';
      params.push(status);
    }

    sql += ' ORDER BY g.created_at DESC';

    const result = await pool.query(sql, params);

    res.json({ giveaways: result.rows });
  } catch (error) {
    console.error('Get giveaways error:', error);
    res.status(500).json({ error: 'Failed to get giveaways' });
  }
});

// Enter giveaway
router.post('/:giveawayId/enter', async (req, res) => {
  try {
    const { giveawayId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const giveaway = await pool.query(
      'SELECT * FROM giveaways WHERE id = $1',
      [giveawayId]
    );

    if (giveaway.rows.length === 0) {
      return res.status(404).json({ error: 'Giveaway not found' });
    }

    if (giveaway.rows[0].status !== 'active') {
      return res.status(400).json({ error: 'Giveaway is not active' });
    }

    if (new Date() > new Date(giveaway.rows[0].end_time)) {
      return res.status(400).json({ error: 'Giveaway has ended' });
    }

    // Check if already entered
    const existing = await pool.query(
      'SELECT * FROM giveaway_entries WHERE giveaway_id = $1 AND user_id = $2',
      [giveawayId, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already entered this giveaway' });
    }

    await pool.query(
      `INSERT INTO giveaway_entries (giveaway_id, user_id, entered_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [giveawayId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Enter giveaway error:', error);
    res.status(500).json({ error: 'Failed to enter giveaway' });
  }
});

// Get giveaway entries
router.get('/:giveawayId/entries', async (req, res) => {
  try {
    const { giveawayId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT ge.*, u.username, u.avatar_url
       FROM giveaway_entries ge
       LEFT JOIN users u ON ge.user_id = u.id
       WHERE ge.giveaway_id = $1
       ORDER BY ge.entered_at ASC`,
      [giveawayId]
    );

    res.json({ entries: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({ error: 'Failed to get entries' });
  }
});

// End giveaway and pick winners
router.post('/:giveawayId/end', async (req, res) => {
  try {
    const { giveawayId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const giveaway = await pool.query(
      'SELECT * FROM giveaways WHERE id = $1',
      [giveawayId]
    );

    if (giveaway.rows.length === 0) {
      return res.status(404).json({ error: 'Giveaway not found' });
    }

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND (role = 'admin' OR role = 'moderator')`,
      [giveaway.rows[0].server_id, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get all entries
    const entries = await pool.query(
      'SELECT user_id FROM giveaway_entries WHERE giveaway_id = $1',
      [giveawayId]
    );

    if (entries.rows.length === 0) {
      return res.status(400).json({ error: 'No entries to pick winners from' });
    }

    // Randomly select winners
    const winnerCount = giveaway.rows[0].winner_count;
    const shuffled = entries.rows.sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, Math.min(winnerCount, shuffled.length));

    // Mark winners
    for (const winner of winners) {
      await pool.query(
        `INSERT INTO giveaway_winners (giveaway_id, user_id, picked_by, picked_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [giveawayId, winner.user_id, userId]
      );
    }

    // Update giveaway status
    await pool.query(
      "UPDATE giveaways SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = $1",
      [giveawayId]
    );

    // Get winner details
    const winnerDetails = await pool.query(
      `SELECT gw.*, u.username, u.avatar_url
       FROM giveaway_winners gw
       LEFT JOIN users u ON gw.user_id = u.id
       WHERE gw.giveaway_id = $1`,
      [giveawayId]
    );

    res.json({ winners: winnerDetails.rows });
  } catch (error) {
    console.error('End giveaway error:', error);
    res.status(500).json({ error: 'Failed to end giveaway' });
  }
});

// Delete giveaway
router.delete('/:giveawayId', async (req, res) => {
  try {
    const { giveawayId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const giveaway = await pool.query(
      'SELECT * FROM giveaways WHERE id = $1',
      [giveawayId]
    );

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND (role = 'admin' OR role = 'moderator')`,
      [giveaway.rows[0].server_id, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query('DELETE FROM giveaways WHERE id = $1', [giveawayId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete giveaway error:', error);
    res.status(500).json({ error: 'Failed to delete giveaway' });
  }
});

export default router;
