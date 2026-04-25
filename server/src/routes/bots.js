import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Generate bot token
function generateBotToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Create bot
router.post('/', async (req, res) => {
  try {
    const { name, avatarUrl, description, public: isPublic, prefix } = req.body;
    const userId = req.headers['x-user-id'];

    if (!name) {
      return res.status(400).json({ error: 'Bot name is required' });
    }

    const pool = getPool();
    const botId = uuidv4();
    const token = generateBotToken();

    await pool.query(
      `INSERT INTO bots (id, user_id, name, avatar_url, description, token, public, prefix, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [botId, userId, name, avatarUrl || null, description || null, token, isPublic || false, prefix || '/']
    );

    const result = await pool.query(
      'SELECT id, name, avatar_url, description, token, public, prefix, created_at FROM bots WHERE id = $1',
      [botId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create bot error:', error);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

// Get user's bots
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT id, name, avatar_url, description, public, prefix, created_at FROM bots WHERE user_id = $1',
      [userId]
    );

    res.json({ bots: result.rows });
  } catch (error) {
    console.error('Get bots error:', error);
    res.status(500).json({ error: 'Failed to get bots' });
  }
});

// Get public bots
router.get('/public', async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.query(
      `SELECT b.id, b.name, b.avatar_url, b.description, b.prefix, u.username as owner_username
       FROM bots b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.public = TRUE
       ORDER BY b.created_at DESC`
    );

    res.json({ bots: result.rows });
  } catch (error) {
    console.error('Get public bots error:', error);
    res.status(500).json({ error: 'Failed to get public bots' });
  }
});

// Get bot by ID
router.get('/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT b.*, u.username as owner_username
       FROM bots b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
      [botId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get bot error:', error);
    res.status(500).json({ error: 'Failed to get bot' });
  }
});

// Update bot
router.put('/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    const { name, avatarUrl, description, public: isPublic, prefix } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const botCheck = await pool.query(
      'SELECT * FROM bots WHERE id = $1 AND user_id = $2',
      [botId, userId]
    );

    if (botCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Bot not found or unauthorized' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      params.push(avatarUrl);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (isPublic !== undefined) {
      updates.push(`public = $${paramIndex++}`);
      params.push(isPublic);
    }
    if (prefix !== undefined) {
      updates.push(`prefix = $${paramIndex++}`);
      params.push(prefix);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(botId);

    await pool.query(
      `UPDATE bots SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT id, name, avatar_url, description, public, prefix FROM bots WHERE id = $1',
      [botId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update bot error:', error);
    res.status(500).json({ error: 'Failed to update bot' });
  }
});

// Delete bot
router.delete('/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const botCheck = await pool.query(
      'SELECT * FROM bots WHERE id = $1 AND user_id = $2',
      [botId, userId]
    );

    if (botCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Bot not found or unauthorized' });
    }

    await pool.query('DELETE FROM bots WHERE id = $1', [botId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete bot error:', error);
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

// Regenerate bot token
router.post('/:botId/token', async (req, res) => {
  try {
    const { botId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const botCheck = await pool.query(
      'SELECT * FROM bots WHERE id = $1 AND user_id = $2',
      [botId, userId]
    );

    if (botCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Bot not found or unauthorized' });
    }

    const newToken = generateBotToken();

    await pool.query(
      'UPDATE bots SET token = $1 WHERE id = $2',
      [newToken, botId]
    );

    res.json({ token: newToken });
  } catch (error) {
    console.error('Regenerate token error:', error);
    res.status(500).json({ error: 'Failed to regenerate token' });
  }
});

// Add bot to server
router.post('/:botId/invite', async (req, res) => {
  try {
    const { botId } = req.params;
    const { serverId } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user is admin in server
    const memberCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND (role = 'admin' OR user_id = (SELECT owner_id FROM servers WHERE id = $1))`,
      [serverId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Add bot to server as a member
    const botResult = await pool.query('SELECT user_id FROM bots WHERE id = $1', [botId]);
    if (botResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    await pool.query(
      `INSERT INTO server_members (id, server_id, user_id, role, joined_at)
       VALUES (gen_random_uuid(), $1, $2, 'bot', CURRENT_TIMESTAMP)`,
      [serverId, botResult.rows[0].user_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Invite bot error:', error);
    res.status(500).json({ error: 'Failed to invite bot' });
  }
});

// Create bot command
router.post('/:botId/commands', async (req, res) => {
  try {
    const { botId } = req.params;
    const { name, description, handler } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const botCheck = await pool.query(
      'SELECT * FROM bots WHERE id = $1 AND user_id = $2',
      [botId, userId]
    );

    if (botCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Bot not found or unauthorized' });
    }

    const commandId = uuidv4();
    await pool.query(
      `INSERT INTO bot_commands (id, bot_id, name, description, handler, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [commandId, botId, name, description || null, handler]
    );

    const result = await pool.query(
      'SELECT * FROM bot_commands WHERE id = $1',
      [commandId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create bot command error:', error);
    res.status(500).json({ error: 'Failed to create bot command' });
  }
});

// Get bot commands
router.get('/:botId/commands', async (req, res) => {
  try {
    const { botId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM bot_commands WHERE bot_id = $1 ORDER BY name',
      [botId]
    );

    res.json({ commands: result.rows });
  } catch (error) {
    console.error('Get bot commands error:', error);
    res.status(500).json({ error: 'Failed to get bot commands' });
  }
});

// Execute bot command (webhook simulation)
router.post('/:botId/commands/:commandName/execute', async (req, res) => {
  try {
    const { botId, commandName } = req.params;
    const { args, channelId, userId } = req.body;
    const pool = getPool();

    // Get command
    const commandResult = await pool.query(
      'SELECT * FROM bot_commands WHERE bot_id = $1 AND name = $2',
      [botId, commandName]
    );

    if (commandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Command not found' });
    }

    const command = commandResult.rows[0];

    // Execute handler (in production, this would call the bot's webhook)
    // For now, return a simulated response
    const response = {
      type: 'message',
      content: `Bot command "${commandName}" executed with args: ${args ? JSON.stringify(args) : 'none'}`
    };

    res.json({ success: true, response });
  } catch (error) {
    console.error('Execute bot command error:', error);
    res.status(500).json({ error: 'Failed to execute bot command' });
  }
});

export default router;
