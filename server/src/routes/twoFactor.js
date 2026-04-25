import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Generate TOTP secret
router.post('/secret', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const secret = speakeasy.generateSecret({
      name: 'LightChat',
      issuer: 'LightChat'
    });

    // Store secret temporarily (in production, this would be encrypted)
    await pool.query(
      'UPDATE users SET totp_secret = $1 WHERE id = $2',
      [secret.base32, userId]
    );

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    console.error('Generate secret error:', error);
    res.status(500).json({ error: 'Failed to generate TOTP secret' });
  }
});

// Verify TOTP token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Get user's TOTP secret
    const result = await pool.query(
      'SELECT totp_secret FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].totp_secret) {
      return res.status(400).json({ error: 'TOTP not enabled for this account' });
    }

    const secret = result.rows[0].totp_secret;

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (1 minute) for clock drift
    });

    if (verified) {
      // Enable 2FA
      await pool.query(
        'UPDATE users SET two_factor_enabled = TRUE WHERE id = $1',
        [userId]
      );
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Verify TOTP error:', error);
    res.status(500).json({ error: 'Failed to verify TOTP token' });
  }
});

// Disable 2FA
router.post('/disable', async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Verify password (in production, you'd verify the password hash)
    // For now, just disable 2FA
    await pool.query(
      'UPDATE users SET two_factor_enabled = FALSE, totp_secret = NULL WHERE id = $1',
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Check 2FA status
router.get('/status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );

    res.json({ enabled: result.rows[0]?.two_factor_enabled || false });
  } catch (error) {
    console.error('Check 2FA status error:', error);
    res.status(500).json({ error: 'Failed to check 2FA status' });
  }
});

export default router;
