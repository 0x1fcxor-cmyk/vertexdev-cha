import express from 'express';
import crypto from 'crypto';
import resendEmail from '../lib/resend.js';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Generate verification token
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Send verification email
router.post('/send', async (req, res) => {
  try {
    const { email } = req.body;
    const pool = getPool();

    // Generate token
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Get user
    const userResult = await pool.query(
      'SELECT username FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const username = userResult.rows[0].username;

    // Update user with verification token
    await pool.query(
      `UPDATE users 
       SET email_verification_token = $1 
       WHERE email = $2`,
      [token, email]
    );

    // Send email using Resend
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    const result = await resendEmail.sendVerificationEmail(email, username, verificationUrl);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Send verification email error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Verify email
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const pool = getPool();

    // Find user with this token
    const result = await pool.query(
      `SELECT id, email_verification_token FROM users 
       WHERE email_verification_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Verify email
    await pool.query(
      `UPDATE users 
       SET email_verified = TRUE, email_verification_token = NULL 
       WHERE id = $1`,
      [result.rows[0].id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Check verification status
router.get('/status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT email_verified FROM users WHERE id = $1',
      [userId]
    );

    res.json({ verified: result.rows[0]?.email_verified || false });
  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
});

export default router;
