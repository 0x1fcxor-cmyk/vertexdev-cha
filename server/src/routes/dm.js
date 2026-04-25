import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Encryption utilities
function generateKey() {
  return crypto.randomBytes(32);
}

function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return {
    encryptedContent: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedContent, iv, authTag, key) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Get DM conversations
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT dc.*, 
        CASE 
          WHEN dc.user1_id = $1 THEN u2.username
          ELSE u1.username
        END as other_username,
        CASE 
          WHEN dc.user1_id = $1 THEN u2.avatar_url
          ELSE u1.avatar_url
        END as other_avatar,
        CASE 
          WHEN dc.user1_id = $1 THEN u2.status
          ELSE u1.status
        END as other_status
       FROM dm_conversations dc
       LEFT JOIN users u1 ON dc.user1_id = u1.id
       LEFT JOIN users u2 ON dc.user2_id = u2.id
       WHERE dc.user1_id = $1 OR dc.user2_id = $1`,
      [userId]
    );

    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Get DM conversations error:', error);
    res.status(500).json({ error: 'Failed to get DM conversations' });
  }
});

// Get or create DM conversation
router.post('/conversation', async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if conversation already exists
    const existing = await pool.query(
      `SELECT * FROM dm_conversations 
       WHERE (user1_id = $1 AND user2_id = $2) 
       OR (user1_id = $2 AND user2_id = $1)`,
      [userId, otherUserId]
    );

    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    // Create new conversation
    const conversationId = uuidv4();
    await pool.query(
      `INSERT INTO dm_conversations (id, user1_id, user2_id, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [conversationId, userId, otherUserId]
    );

    const result = await pool.query(
      'SELECT * FROM dm_conversations WHERE id = $1',
      [conversationId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create DM conversation error:', error);
    res.status(500).json({ error: 'Failed to create DM conversation' });
  }
});

// Send encrypted DM
router.post('/message', async (req, res) => {
  try {
    const { conversationId, content, key } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Verify user is part of conversation
    const conversationCheck = await pool.query(
      `SELECT * FROM dm_conversations 
       WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [conversationId, userId]
    );

    if (conversationCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized for this conversation' });
    }

    // Encrypt message
    const encryptionKey = Buffer.from(key, 'hex');
    const { encryptedContent, iv, authTag } = encrypt(content, encryptionKey);

    const messageId = uuidv4();
    await pool.query(
      `INSERT INTO encrypted_messages (id, conversation_id, sender_id, encrypted_content, iv, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [messageId, conversationId, userId, `${encryptedContent}:${authTag}`, iv]
    );

    res.status(201).json({ 
      success: true, 
      messageId,
      encrypted: true
    });
  } catch (error) {
    console.error('Send DM error:', error);
    res.status(500).json({ error: 'Failed to send DM' });
  }
});

// Get DM messages
router.get('/conversation/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Verify user is part of conversation
    const conversationCheck = await pool.query(
      `SELECT * FROM dm_conversations 
       WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [conversationId, userId]
    );

    if (conversationCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized for this conversation' });
    }

    const result = await pool.query(
      `SELECT em.id, em.sender_id, em.encrypted_content, em.iv, em.created_at, u.username, u.avatar_url
       FROM encrypted_messages em
       LEFT JOIN users u ON em.sender_id = u.id
       WHERE em.conversation_id = $1
       ORDER BY em.created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, parseInt(limit), parseInt(offset)]
    );

    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error('Get DM messages error:', error);
    res.status(500).json({ error: 'Failed to get DM messages' });
  }
});

// Delete DM conversation
router.delete('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `DELETE FROM dm_conversations 
       WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [conversationId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete DM conversation error:', error);
    res.status(500).json({ error: 'Failed to delete DM conversation' });
  }
});

export default router;
