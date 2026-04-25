import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create ticket
router.post('/', async (req, res) => {
  try {
    const { serverId, channelId, subject, description, category, priority, userId } = req.body;
    const creatorId = req.headers['x-user-id'] || userId;
    const pool = getPool();

    const ticketId = uuidv4();

    await pool.query(
      `INSERT INTO tickets (id, server_id, channel_id, user_id, subject, description, category, priority, status, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, CURRENT_TIMESTAMP)`,
      [ticketId, serverId, channelId, userId || creatorId, subject, description, category, priority || 'normal', creatorId]
    );

    const result = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [ticketId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Get tickets for server
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { status, priority, category } = req.query;
    const pool = getPool();

    let sql = `SELECT t.*, u.username as user_username, c.username as closed_by_username
               FROM tickets t
               LEFT JOIN users u ON t.user_id = u.id
               LEFT JOIN users c ON t.closed_by = c.id
               WHERE t.server_id = $1`;
    const params = [serverId];

    if (status) {
      sql += ' AND t.status = $2';
      params.push(status);
    }
    if (priority) {
      sql += ' AND t.priority = $' + (params.length + 1);
      params.push(priority);
    }
    if (category) {
      sql += ' AND t.category = $' + (params.length + 1);
      params.push(category);
    }

    sql += ' ORDER BY t.created_at DESC';

    const result = await pool.query(sql, params);

    res.json({ tickets: result.rows });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
});

// Get ticket details
router.get('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT t.*, u.username as user_username, c.username as closed_by_username
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN users c ON t.closed_by = c.id
       WHERE t.id = $1`,
      [ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Get ticket responses
    const responses = await pool.query(
      `SELECT tr.*, u.username as responder_username
       FROM ticket_responses tr
       LEFT JOIN users u ON tr.user_id = u.id
       WHERE tr.ticket_id = $1
       ORDER BY tr.created_at ASC`,
      [ticketId]
    );

    res.json({ ticket: result.rows[0], responses: responses.rows });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
});

// Add response to ticket
router.post('/:ticketId/responses', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content, isInternal } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const responseId = uuidv4();

    await pool.query(
      `INSERT INTO ticket_responses (id, ticket_id, user_id, content, is_internal, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [responseId, ticketId, userId, content, isInternal || false]
    );

    // Update ticket status if it was closed
    await pool.query(
      "UPDATE tickets SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'closed'",
      [ticketId]
    );

    const result = await pool.query(
      'SELECT * FROM ticket_responses WHERE id = $1',
      [responseId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({ error: 'Failed to add response' });
  }
});

// Update ticket status
router.put('/:ticketId/status', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, closedReason } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    let sql = 'UPDATE tickets SET status = $1, updated_at = CURRENT_TIMESTAMP';
    const params = [status];

    if (status === 'closed') {
      sql += ', closed_by = $2, closed_reason = $3, closed_at = CURRENT_TIMESTAMP';
      params.push(userId);
      params.push(closedReason);
    }

    params.push(ticketId);

    await pool.query(sql, params);

    const result = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [ticketId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

// Assign ticket
router.put('/:ticketId/assign', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { assignedTo } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      'UPDATE tickets SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [assignedTo, ticketId]
    );

    const result = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [ticketId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({ error: 'Failed to assign ticket' });
  }
});

// Get user's tickets
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    const pool = getPool();

    let sql = 'SELECT * FROM tickets WHERE user_id = $1';
    const params = [userId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await pool.query(sql, params);

    res.json({ tickets: result.rows });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ error: 'Failed to get user tickets' });
  }
});

export default router;
