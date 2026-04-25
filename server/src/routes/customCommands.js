import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create custom command
router.post('/', async (req, res) => {
  try {
    const { name, trigger, response, cooldown, enabled, serverId } = req.body;
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

    const commandId = uuidv4();

    await pool.query(
      `INSERT INTO custom_commands (id, server_id, name, trigger, response, cooldown, enabled, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [commandId, serverId, name, trigger, response, cooldown || 0, enabled !== false, userId]
    );

    const result = await pool.query(
      'SELECT * FROM custom_commands WHERE id = $1',
      [commandId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create custom command error:', error);
    res.status(500).json({ error: 'Failed to create custom command' });
  }
});

// Get custom commands for server
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT cc.*, u.username as created_by_username 
       FROM custom_commands cc
       LEFT JOIN users u ON cc.created_by = u.id
       WHERE cc.server_id = $1
       ORDER BY cc.created_at DESC`,
      [serverId]
    );

    res.json({ commands: result.rows });
  } catch (error) {
    console.error('Get custom commands error:', error);
    res.status(500).json({ error: 'Failed to get custom commands' });
  }
});

// Update custom command
router.put('/:commandId', async (req, res) => {
  try {
    const { commandId } = req.params;
    const { name, trigger, response, cooldown, enabled } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership/permissions
    const commandCheck = await pool.query(
      `SELECT cc.*, sm.role 
       FROM custom_commands cc
       LEFT JOIN server_members sm ON cc.server_id = sm.server_id
       WHERE cc.id = $1 AND sm.user_id = $2`,
      [commandId, userId]
    );

    if (commandCheck.rows.length === 0 || commandCheck.rows[0].role === 'member') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (trigger !== undefined) {
      updates.push(`trigger = $${paramIndex++}`);
      params.push(trigger);
    }
    if (response !== undefined) {
      updates.push(`response = $${paramIndex++}`);
      params.push(response);
    }
    if (cooldown !== undefined) {
      updates.push(`cooldown = $${paramIndex++}`);
      params.push(cooldown);
    }
    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`);
      params.push(enabled);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(commandId);

    await pool.query(
      `UPDATE custom_commands SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM custom_commands WHERE id = $1',
      [commandId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update custom command error:', error);
    res.status(500).json({ error: 'Failed to update custom command' });
  }
});

// Delete custom command
router.delete('/:commandId', async (req, res) => {
  try {
    const { commandId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership/permissions
    const commandCheck = await pool.query(
      `SELECT cc.*, sm.role 
       FROM custom_commands cc
       LEFT JOIN server_members sm ON cc.server_id = sm.server_id
       WHERE cc.id = $1 AND sm.user_id = $2`,
      [commandId, userId]
    );

    if (commandCheck.rows.length === 0 || commandCheck.rows[0].role === 'member') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query('DELETE FROM custom_commands WHERE id = $1', [commandId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete custom command error:', error);
    res.status(500).json({ error: 'Failed to delete custom command' });
  }
});

// Execute custom command
router.post('/execute/:commandId', async (req, res) => {
  try {
    const { commandId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const command = await pool.query(
      'SELECT * FROM custom_commands WHERE id = $1 AND enabled = TRUE',
      [commandId]
    );

    if (command.rows.length === 0) {
      return res.status(404).json({ error: 'Command not found or disabled' });
    }

    // Check cooldown
    if (command.rows[0].cooldown > 0) {
      const lastUsed = await pool.query(
        `SELECT last_used_at FROM command_usage 
         WHERE command_id = $1 AND user_id = $2 
         AND last_used_at >= CURRENT_TIMESTAMP - INTERVAL '1 second' * $3`,
        [commandId, userId, command.rows[0].cooldown]
      );

      if (lastUsed.rows.length > 0) {
        const remaining = Math.ceil(command.rows[0].cooldown - (Date.now() - new Date(lastUsed.rows[0].last_used_at).getTime()) / 1000);
        return res.status(429).json({ error: `Command on cooldown. Wait ${remaining}s` });
      }
    }

    // Log usage
    await pool.query(
      `INSERT INTO command_usage (command_id, user_id, last_used_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (command_id, user_id) DO UPDATE SET last_used_at = CURRENT_TIMESTAMP`,
      [commandId, userId]
    );

    // Return response
    res.json({ response: command.rows[0].response });
  } catch (error) {
    console.error('Execute custom command error:', error);
    res.status(500).json({ error: 'Failed to execute command' });
  }
});

export default router;
