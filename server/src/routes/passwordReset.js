import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import resendEmail from '../lib/resend.js';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Generate reset token
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Request password reset
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;
    const pool = getPool();

    // Find user by email
    const result = await pool.query(
      'SELECT id, username FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return res.json({ success: true });
    }

    const user = result.rows[0];

    // Generate reset token
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await pool.query(
      `UPDATE users 
       SET password_reset_token = $1, password_reset_expires = $2 
       WHERE id = $3`,
      [token, expiresAt, user.id]
    );

    // Send email using Resend
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const emailResult = await resendEmail.sendPasswordResetEmail(email, user.username, resetUrl);

    if (!emailResult.success) {
      throw new Error(emailResult.error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ error: 'Failed to send password reset email' });
  }
});

// Reset password
router.post('/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const pool = getPool();

    // Find user with this token
    const result = await pool.query(
      `SELECT id, password_reset_token, password_reset_expires 
       FROM users 
       WHERE password_reset_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];

    // Check if token is expired
    if (new Date(user.password_reset_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL 
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Validate reset token
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;
    const pool = getPool();

    const result = await pool.query(
      `SELECT password_reset_expires 
       FROM users 
       WHERE password_reset_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.json({ valid: false });
    }

    const user = result.rows[0];

    // Check if token is expired
    const valid = new Date(user.password_reset_expires) > new Date();

    res.json({ valid });
  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

export default router;
