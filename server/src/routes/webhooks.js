import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Generate webhook secret
function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}

// Verify webhook signature
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// Get webhooks
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { serverId } = req.query;
    const pool = getPool();

    let sql = 'SELECT * FROM webhooks WHERE user_id = $1 AND active = TRUE';
    const params = [userId];

    if (serverId) {
      sql += ' AND server_id = $2';
      params.push(serverId);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await pool.query(sql, params);

    res.json({ webhooks: result.rows });
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({ error: 'Failed to get webhooks' });
  }
});

// Create webhook
router.post('/', async (req, res) => {
  try {
    const { serverId, name, url, events } = req.body;
    const userId = req.headers['x-user-id'];

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    const pool = getPool();
    const webhookId = uuidv4();
    const secret = generateWebhookSecret();

    await pool.query(
      `INSERT INTO webhooks (id, user_id, server_id, name, url, secret, events, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, CURRENT_TIMESTAMP)`,
      [webhookId, userId, serverId || null, name, url, secret, events || ['message_create']]
    );

    const result = await pool.query(
      'SELECT id, name, url, events FROM webhooks WHERE id = $1',
      [webhookId]
    );

    // Return secret only once
    res.status(201).json({ 
      ...result.rows[0], 
      secret 
    });
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// Update webhook
router.put('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { name, url, events, active } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const webhookCheck = await pool.query(
      'SELECT * FROM webhooks WHERE id = $1 AND user_id = $2',
      [webhookId, userId]
    );

    if (webhookCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Webhook not found or unauthorized' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (url !== undefined) {
      updates.push(`url = $${paramIndex++}`);
      params.push(url);
    }
    if (events !== undefined) {
      updates.push(`events = $${paramIndex++}`);
      params.push(events);
    }
    if (active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      params.push(active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(webhookId);

    await pool.query(
      `UPDATE webhooks SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM webhooks WHERE id = $1',
      [webhookId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update webhook error:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

// Delete webhook
router.delete('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      'DELETE FROM webhooks WHERE id = $1 AND user_id = $2',
      [webhookId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// Regenerate webhook secret
router.post('/:webhookId/secret', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const webhookCheck = await pool.query(
      'SELECT * FROM webhooks WHERE id = $1 AND user_id = $2',
      [webhookId, userId]
    );

    if (webhookCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Webhook not found or unauthorized' });
    }

    const newSecret = generateWebhookSecret();

    await pool.query(
      'UPDATE webhooks SET secret = $1 WHERE id = $2',
      [newSecret, webhookId]
    );

    res.json({ secret: newSecret });
  } catch (error) {
    console.error('Regenerate secret error:', error);
    res.status(500).json({ error: 'Failed to regenerate webhook secret' });
  }
});

// Get webhook delivery logs
router.get('/:webhookId/deliveries', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { limit = 50 } = req.query;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const webhookCheck = await pool.query(
      'SELECT * FROM webhooks WHERE id = $1 AND user_id = $2',
      [webhookId, userId]
    );

    if (webhookCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Webhook not found or unauthorized' });
    }

    const result = await pool.query(
      `SELECT * FROM webhook_deliveries 
       WHERE webhook_id = $1 
       ORDER BY delivered_at DESC 
       LIMIT $2`,
      [webhookId, parseInt(limit)]
    );

    res.json({ deliveries: result.rows });
  } catch (error) {
    console.error('Get webhook deliveries error:', error);
    res.status(500).json({ error: 'Failed to get webhook deliveries' });
  }
});

// Trigger webhook test
router.post('/:webhookId/test', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const webhookCheck = await pool.query(
      'SELECT * FROM webhooks WHERE id = $1 AND user_id = $2',
      [webhookId, userId]
    );

    if (webhookCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Webhook not found or unauthorized' });
    }

    const webhook = webhookCheck.rows[0];

    // Send test payload
    const testPayload = {
      event: 'test',
      data: {
        message: 'Webhook test successful',
        timestamp: new Date().toISOString()
      }
    };

    // This would normally trigger the actual webhook delivery
    // For now, just return success
    res.json({ 
      success: true, 
      testPayload,
      message: 'Test webhook would be delivered to: ' + webhook.url
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

export default router;
