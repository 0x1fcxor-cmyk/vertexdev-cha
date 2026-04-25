import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Generate invite code
function generateInviteCode() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

// Create server invite
router.post('/', async (req, res) => {
  try {
    const { serverId, maxUses, temporary, expiresIn } = req.body;
    const userId = req.headers['x-user-id'];

    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }

    const pool = getPool();
    const code = generateInviteCode();
    const inviteId = uuidv4();

    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 1000);
    }

    await pool.query(
      `INSERT INTO server_invites (id, server_id, code, created_by, max_uses, temporary, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [inviteId, serverId, code, userId, maxUses, temporary || false, expiresAt]
    );

    const result = await pool.query(
      'SELECT * FROM server_invites WHERE id = $1',
      [inviteId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// Get server invites
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT si.*, u.username as created_by_username 
       FROM server_invites si
       LEFT JOIN users u ON si.created_by = u.id
       WHERE si.server_id = $1
       ORDER BY si.created_at DESC`,
      [serverId]
    );

    res.json({ invites: result.rows });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: 'Failed to get invites' });
  }
});

// Join server via invite
router.post('/join/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Find invite
    const inviteResult = await pool.query(
      'SELECT * FROM server_invites WHERE code = $1',
      [code]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const invite = inviteResult.rows[0];

    // Check if invite is expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' });
    }

    // Check if invite has reached max uses
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      return res.status(400).json({ error: 'Invite has reached maximum uses' });
    }

    // Check if user is already a member
    const memberCheck = await pool.query(
      'SELECT * FROM server_members WHERE server_id = $1 AND user_id = $2',
      [invite.server_id, userId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already a member of this server' });
    }

    // Add user to server
    await pool.query(
      `INSERT INTO server_members (id, server_id, user_id, joined_at)
       VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP)`,
      [invite.server_id, userId]
    );

    // Increment invite uses
    await pool.query(
      'UPDATE server_invites SET uses = uses + 1 WHERE id = $1',
      [invite.id]
    );

    // Record invite use
    await pool.query(
      `INSERT INTO invite_uses (id, invite_id, user_id, used_at)
       VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP)`,
      [invite.id, userId]
    );

    res.json({ success: true, serverId: invite.server_id });
  } catch (error) {
    console.error('Join via invite error:', error);
    res.status(500).json({ error: 'Failed to join server' });
  }
});

// Delete invite
router.delete('/:inviteId', async (req, res) => {
  try {
    const { inviteId } = req.params;
    const pool = getPool();

    await pool.query('DELETE FROM server_invites WHERE id = $1', [inviteId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete invite error:', error);
    res.status(500).json({ error: 'Failed to delete invite' });
  }
});

export default router;
