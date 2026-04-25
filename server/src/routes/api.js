import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Generate API key
function generateApiKey() {
  return 'lc_' + crypto.randomBytes(32).toString('hex');
}

// Hash API key for storage
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Get user's API keys
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, name, scopes, last_used, expires_at, created_at 
       FROM api_keys 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ apiKeys: result.rows });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Failed to get API keys' });
  }
});

// Create API key
router.post('/', async (req, res) => {
  try {
    const { name, scopes, expiresIn } = req.body;
    const userId = req.headers['x-user-id'];

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const pool = getPool();
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const apiKeyId = uuidv4();

    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 1000);
    }

    await pool.query(
      `INSERT INTO api_keys (id, user_id, name, key_hash, scopes, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [apiKeyId, userId, name, keyHash, scopes || ['read'], expiresAt]
    );

    // Return the actual API key only once
    res.status(201).json({ 
      id: apiKeyId, 
      name, 
      apiKey,
      scopes: scopes || ['read'],
      expiresAt 
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Delete API key
router.delete('/:apiKeyId', async (req, res) => {
  try {
    const { apiKeyId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2',
      [apiKeyId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// Middleware to verify API key
export async function verifyApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const pool = getPool();
    const keyHash = hashApiKey(apiKey);

    const result = await pool.query(
      `SELECT ak.*, u.id as user_id 
       FROM api_keys ak
       LEFT JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1 AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired API key' });
    }

    req.apiKey = result.rows[0];
    req.userId = result.rows[0].user_id;

    // Update last used
    await pool.query(
      'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
      [result.rows[0].id]
    );

    next();
  } catch (error) {
    console.error('Verify API key error:', error);
    res.status(500).json({ error: 'Failed to verify API key' });
  }
}

// API Documentation endpoint
router.get('/docs', (req, res) => {
  const docs = {
    version: '1.0.0',
    title: 'LightChat API',
    baseUrl: '/api/v1',
    authentication: {
      type: 'API Key',
      header: 'x-api-key',
      description: 'Include your API key in the x-api-key header'
    },
    endpoints: [
      {
        method: 'GET',
        path: '/servers',
        description: 'Get all servers for the authenticated user',
        scopes: ['read']
      },
      {
        method: 'POST',
        path: '/servers',
        description: 'Create a new server',
        scopes: ['write']
      },
      {
        method: 'GET',
        path: '/channels/:serverId',
        description: 'Get all channels in a server',
        scopes: ['read']
      },
      {
        method: 'POST',
        path: '/messages',
        description: 'Send a message to a channel',
        scopes: ['write']
      },
      {
        method: 'GET',
        path: '/messages/:channelId',
        description: 'Get messages from a channel',
        scopes: ['read']
      },
      {
        method: 'POST',
        path: '/webhooks',
        description: 'Create a webhook',
        scopes: ['webhooks']
      },
      {
        method: 'GET',
        path: '/users/:userId',
        description: 'Get user information',
        scopes: ['read']
      }
    ],
    webhooks: {
      description: 'Webhooks allow you to receive real-time notifications',
      events: [
        'message_create',
        'message_update',
        'message_delete',
        'member_join',
        'member_leave',
        'reaction_add',
        'reaction_remove'
      ],
      examplePayload: {
        event: 'message_create',
        data: {
          id: 'uuid',
          content: 'Hello world',
          author: { id: 'uuid', username: 'user' },
          channel_id: 'uuid',
          timestamp: '2024-01-01T00:00:00Z'
        }
      }
    }
  };

  res.json(docs);
});

export default router;
