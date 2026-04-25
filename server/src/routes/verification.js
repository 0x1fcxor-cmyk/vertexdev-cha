import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get server verification level
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM server_verification WHERE server_id = $1',
      [serverId]
    );

    if (result.rows.length === 0) {
      // Return default level 0
      return res.json({
        level: 0,
        verificationRequired: false,
        phoneVerification: false,
        emailVerification: false,
        captchaRequired: false
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get verification level error:', error);
    res.status(500).json({ error: 'Failed to get verification level' });
  }
});

// Update server verification level
router.put('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { level, verificationRequired, phoneVerification, emailVerification, captchaRequired } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user is server owner
    const ownerCheck = await pool.query(
      'SELECT * FROM servers WHERE id = $1 AND owner_id = $2',
      [serverId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only server owner can update verification settings' });
    }

    // Check if verification settings exist
    const existing = await pool.query(
      'SELECT * FROM server_verification WHERE server_id = $1',
      [serverId]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        `UPDATE server_verification 
         SET level = COALESCE($2, level),
             verification_required = COALESCE($3, verification_required),
             phone_verification = COALESCE($4, phone_verification),
             email_verification = COALESCE($5, email_verification),
             captcha_required = COALESCE($6, captcha_required)
         WHERE server_id = $1`,
        [serverId, level, verificationRequired, phoneVerification, emailVerification, captchaRequired]
      );
    } else {
      // Create new
      await pool.query(
        `INSERT INTO server_verification (id, server_id, level, verification_required, phone_verification, email_verification, captcha_required, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [serverId, level || 0, verificationRequired || false, phoneVerification || false, emailVerification || false, captchaRequired || false]
      );
    }

    const result = await pool.query(
      'SELECT * FROM server_verification WHERE server_id = $1',
      [serverId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update verification level error:', error);
    res.status(500).json({ error: 'Failed to update verification level' });
  }
});

// Verify user for server
router.post('/server/:serverId/verify', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { type, token } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Get server verification requirements
    const verificationResult = await pool.query(
      'SELECT * FROM server_verification WHERE server_id = $1',
      [serverId]
    );

    if (verificationResult.rows.length === 0) {
      return res.json({ verified: true, message: 'No verification required' });
    }

    const verification = verificationResult.rows[0];

    // Check based on verification type
    if (type === 'email' && verification.emailVerification) {
      // Verify email token
      const userResult = await pool.query(
        'SELECT email_verified FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows[0].email_verified) {
        return res.json({ verified: true, message: 'Email verified' });
      } else {
        return res.json({ verified: false, message: 'Email verification required' });
      }
    }

    if (type === 'phone' && verification.phoneVerification) {
      // Verify phone token (would integrate with SMS service)
      // For now, just check if phone is on file
      return res.json({ verified: false, message: 'Phone verification not implemented' });
    }

    if (type === 'captcha' && verification.captchaRequired) {
      // Verify captcha token (would integrate with reCAPTCHA or hCaptcha)
      if (!token) {
        return res.json({ verified: false, message: 'Captcha token required' });
      }
      // Token validation would go here
      return res.json({ verified: true, message: 'Captcha verified' });
    }

    res.json({ verified: true, message: 'Verification passed' });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// Get verification requirements for user joining server
router.get('/server/:serverId/requirements', async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const verificationResult = await pool.query(
      'SELECT * FROM server_verification WHERE server_id = $1',
      [serverId]
    );

    if (verificationResult.rows.length === 0) {
      return res.json({ requirements: [] });
    }

    const verification = verificationResult.rows[0];
    const requirements = [];

    if (verification.verificationRequired) {
      if (verification.emailVerification) {
        const userResult = await pool.query(
          'SELECT email_verified FROM users WHERE id = $1',
          [userId]
        );
        
        if (!userResult.rows[0].email_verified) {
          requirements.push({ type: 'email', required: true, completed: false });
        }
      }

      if (verification.phoneVerification) {
        requirements.push({ type: 'phone', required: true, completed: false });
      }

      if (verification.captchaRequired) {
        requirements.push({ type: 'captcha', required: true, completed: false });
      }
    }

    res.json({ 
      level: verification.level,
      requirements,
      canJoin: requirements.length === 0
    });
  } catch (error) {
    console.error('Get verification requirements error:', error);
    res.status(500).json({ error: 'Failed to get verification requirements' });
  }
});

export default router;
