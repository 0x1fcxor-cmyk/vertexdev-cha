import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create moderation rule
router.post('/rules', async (req, res) => {
  try {
    const { serverId, name, type, pattern, action, enabled } = req.body;
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

    const ruleId = uuidv4();

    await pool.query(
      `INSERT INTO moderation_rules (id, server_id, name, type, pattern, action, enabled, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [ruleId, serverId, name, type, pattern, action, enabled !== false, userId]
    );

    const result = await pool.query(
      'SELECT * FROM moderation_rules WHERE id = $1',
      [ruleId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create moderation rule error:', error);
    res.status(500).json({ error: 'Failed to create moderation rule' });
  }
});

// Get moderation rules for server
router.get('/rules/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT mr.*, u.username as created_by_username 
       FROM moderation_rules mr
       LEFT JOIN users u ON mr.created_by = u.id
       WHERE mr.server_id = $1
       ORDER BY mr.created_at DESC`,
      [serverId]
    );

    res.json({ rules: result.rows });
  } catch (error) {
    console.error('Get moderation rules error:', error);
    res.status(500).json({ error: 'Failed to get moderation rules' });
  }
});

// Update moderation rule
router.put('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { name, type, pattern, action, enabled } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const ruleCheck = await pool.query(
      `SELECT mr.*, sm.role 
       FROM moderation_rules mr
       LEFT JOIN server_members sm ON mr.server_id = sm.server_id
       WHERE mr.id = $1 AND sm.user_id = $2`,
      [ruleId, userId]
    );

    if (ruleCheck.rows.length === 0 || ruleCheck.rows[0].role === 'member') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      params.push(type);
    }
    if (pattern !== undefined) {
      updates.push(`pattern = $${paramIndex++}`);
      params.push(pattern);
    }
    if (action !== undefined) {
      updates.push(`action = $${paramIndex++}`);
      params.push(action);
    }
    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`);
      params.push(enabled);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(ruleId);

    await pool.query(
      `UPDATE moderation_rules SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM moderation_rules WHERE id = $1',
      [ruleId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update moderation rule error:', error);
    res.status(500).json({ error: 'Failed to update moderation rule' });
  }
});

// Delete moderation rule
router.delete('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const ruleCheck = await pool.query(
      `SELECT mr.*, sm.role 
       FROM moderation_rules mr
       LEFT JOIN server_members sm ON mr.server_id = sm.server_id
       WHERE mr.id = $1 AND sm.user_id = $2`,
      [ruleId, userId]
    );

    if (ruleCheck.rows.length === 0 || ruleCheck.rows[0].role === 'member') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query('DELETE FROM moderation_rules WHERE id = $1', [ruleId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete moderation rule error:', error);
    res.status(500).json({ error: 'Failed to delete moderation rule' });
  }
});

// Create moderation action
router.post('/actions', async (req, res) => {
  try {
    const { serverId, userId, actionType, reason, duration, moderatorNote } = req.body;
    const moderatorId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND (role = 'admin' OR role = 'moderator')`,
      [serverId, moderatorId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const actionId = uuidv4();
    const expiresAt = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null;

    await pool.query(
      `INSERT INTO moderation_actions (id, server_id, user_id, action_type, reason, duration, expires_at, moderator_id, moderator_note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [actionId, serverId, userId, actionType, reason, duration, expiresAt, moderatorId, moderatorNote]
    );

    // Apply the action
    if (actionType === 'mute') {
      await pool.query(
        'UPDATE server_members SET muted_until = $1 WHERE server_id = $2 AND user_id = $3',
        [expiresAt, serverId, userId]
      );
    } else if (actionType === 'timeout') {
      await pool.query(
        'UPDATE server_members SET timeout_until = $1 WHERE server_id = $2 AND user_id = $3',
        [expiresAt, serverId, userId]
      );
    } else if (actionType === 'ban') {
      await pool.query(
        'UPDATE server_members SET is_banned = TRUE, banned_until = $1 WHERE server_id = $2 AND user_id = $3',
        [expiresAt, serverId, userId]
      );
    }

    const result = await pool.query(
      'SELECT * FROM moderation_actions WHERE id = $1',
      [actionId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create moderation action error:', error);
    res.status(500).json({ error: 'Failed to create moderation action' });
  }
});

// Get moderation actions for server
router.get('/actions/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { limit = 50 } = req.query;
    const pool = getPool();

    const result = await pool.query(
      `SELECT ma.*, u.username as user_username, m.username as moderator_username
       FROM moderation_actions ma
       LEFT JOIN users u ON ma.user_id = u.id
       LEFT JOIN users m ON ma.moderator_id = m.id
       WHERE ma.server_id = $1
       ORDER BY ma.created_at DESC
       LIMIT $2`,
      [serverId, parseInt(limit)]
    );

    res.json({ actions: result.rows });
  } catch (error) {
    console.error('Get moderation actions error:', error);
    res.status(500).json({ error: 'Failed to get moderation actions' });
  }
});

// Revert moderation action
router.post('/actions/:actionId/revert', async (req, res) => {
  try {
    const { actionId } = req.params;
    const moderatorId = req.headers['x-user-id'];
    const pool = getPool();

    const action = await pool.query(
      'SELECT * FROM moderation_actions WHERE id = $1',
      [actionId]
    );

    if (action.rows.length === 0) {
      return res.status(404).json({ error: 'Action not found' });
    }

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND (role = 'admin' OR role = 'moderator')`,
      [action.rows[0].server_id, moderatorId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Revert the action
    if (action.rows[0].action_type === 'mute') {
      await pool.query(
        'UPDATE server_members SET muted_until = NULL WHERE server_id = $1 AND user_id = $2',
        [action.rows[0].server_id, action.rows[0].user_id]
      );
    } else if (action.rows[0].action_type === 'timeout') {
      await pool.query(
        'UPDATE server_members SET timeout_until = NULL WHERE server_id = $1 AND user_id = $2',
        [action.rows[0].server_id, action.rows[0].user_id]
      );
    } else if (action.rows[0].action_type === 'ban') {
      await pool.query(
        'UPDATE server_members SET is_banned = FALSE, banned_until = NULL WHERE server_id = $1 AND user_id = $2',
        [action.rows[0].server_id, action.rows[0].user_id]
      );
    }

    await pool.query(
      'UPDATE moderation_actions SET reverted = TRUE, reverted_by = $1, reverted_at = CURRENT_TIMESTAMP WHERE id = $2',
      [moderatorId, actionId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Revert moderation action error:', error);
    res.status(500).json({ error: 'Failed to revert moderation action' });
  }
});

export default router;
