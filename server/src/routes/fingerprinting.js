import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Generate device fingerprint
function generateFingerprint(userAgent, ip, screenResolution, timezone, language) {
  const data = `${userAgent}|${ip}|${screenResolution}|${timezone}|${language}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Check if fingerprint is suspicious
function isSuspiciousFingerprint(fingerprintData, existingFingerprints) {
  const suspiciousPatterns = [
    // Multiple accounts from same fingerprint
    existingFingerprints.length > 5,
    // Short time between account creations
    existingFingerprints.some(fp => {
      const hoursSinceCreation = (Date.now() - new Date(fp.first_seen).getTime()) / (1000 * 60 * 60);
      return hoursSinceCreation < 1;
    }),
    // Common bot user agents
    /bot|crawler|spider|scraper/i.test(fingerprintData.userAgent)
  ];

  return suspiciousPatterns.some(pattern => pattern === true);
}

// Record fingerprint on login/registration
router.post('/record', async (req, res) => {
  try {
    const { userAgent, ipAddress, screenResolution, timezone, language } = req.body;
    const userId = req.headers['x-user-id'];

    if (!userAgent || !ipAddress) {
      return res.status(400).json({ error: 'User agent and IP address are required' });
    }

    const pool = getPool();
    const fingerprintHash = generateFingerprint(userAgent, ipAddress, screenResolution, timezone, language);

    // Check if this fingerprint exists
    const existing = await pool.query(
      `SELECT * FROM user_fingerprints 
       WHERE fingerprint_hash = $1 
       ORDER BY last_seen DESC`,
      [fingerprintHash]
    );

    const fingerprintId = uuidv4();
    const isExistingUser = existing.rows.length > 0;

    if (isExistingUser) {
      // Update existing fingerprint
      await pool.query(
        `UPDATE user_fingerprints 
         SET last_seen = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [existing.rows[0].id]
      );
    } else {
      // Create new fingerprint record
      await pool.query(
        `INSERT INTO user_fingerprints (id, user_id, fingerprint_hash, user_agent, ip_address, screen_resolution, timezone, language, first_seen, last_seen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [fingerprintId, userId, fingerprintHash, userAgent, ipAddress, screenResolution, timezone, language]
      );
    }

    // Check for suspicious activity
    const allFingerprintsForHash = await pool.query(
      `SELECT * FROM user_fingerprints 
       WHERE fingerprint_hash = $1`,
      [fingerprintHash]
    );

    const suspicious = isSuspiciousFingerprint(
      { userAgent, ipAddress, screenResolution, timezone, language },
      allFingerprintsForHash.rows
    );

    res.json({
      success: true,
      fingerprintId,
      suspicious,
      accountCount: allFingerprintsForHash.rows.length,
      isNewFingerprint: !isExistingUser
    });
  } catch (error) {
    console.error('Record fingerprint error:', error);
    res.status(500).json({ error: 'Failed to record fingerprint' });
  }
});

// Get user's fingerprints
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM user_fingerprints WHERE user_id = $1 ORDER BY last_seen DESC',
      [userId]
    );

    res.json({ fingerprints: result.rows });
  } catch (error) {
    console.error('Get fingerprints error:', error);
    res.status(500).json({ error: 'Failed to get fingerprints' });
  }
});

// Check IP reputation
router.post('/check-ip', async (req, res) => {
  try {
    const { ipAddress } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    const pool = getPool();

    // Check how many accounts have this IP
    const ipResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as user_count,
              COUNT(*) as fingerprint_count
       FROM user_fingerprints
       WHERE ip_address = $1`,
      [ipAddress]
    );

    // Check for VPN/Proxy (simplified check)
    const isVPN = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(ipAddress);

    // Calculate risk score
    const userCount = parseInt(ipResult.rows[0].user_count);
    const fingerprintCount = parseInt(ipResult.rows[0].fingerprint_count);
    
    let riskScore = 0;
    if (userCount > 10) riskScore += 30;
    if (userCount > 50) riskScore += 20;
    if (fingerprintCount > 20) riskScore += 20;
    if (isVPN) riskScore += 10;

    const riskLevel = riskScore < 20 ? 'low' : riskScore < 50 ? 'medium' : 'high';

    res.json({
      ipAddress,
      userCount,
      fingerprintCount,
      isVPN,
      riskScore,
      riskLevel
    });
  } catch (error) {
    console.error('Check IP error:', error);
    res.status(500).json({ error: 'Failed to check IP reputation' });
  }
});

// Get suspicious activity report
router.get('/suspicious', async (req, res) => {
  try {
    const pool = getPool();

    // Find fingerprints with many accounts
    const suspiciousFingerprints = await pool.query(
      `SELECT fingerprint_hash, ip_address, COUNT(DISTINCT user_id) as user_count
       FROM user_fingerprints
       GROUP BY fingerprint_hash, ip_address
       HAVING COUNT(DISTINCT user_id) > 5
       ORDER BY user_count DESC
       LIMIT 50`
    );

    // Find users with many different fingerprints
    const suspiciousUsers = await pool.query(
      `SELECT uf.user_id, u.username, COUNT(DISTINCT uf.fingerprint_hash) as fingerprint_count
       FROM user_fingerprints uf
       LEFT JOIN users u ON uf.user_id = u.id
       GROUP BY uf.user_id, u.username
       HAVING COUNT(DISTINCT uf.fingerprint_hash) > 3
       ORDER BY fingerprint_count DESC
       LIMIT 50`
    );

    res.json({
      suspiciousFingerprints: suspiciousFingerprints.rows,
      suspiciousUsers: suspiciousUsers.rows
    });
  } catch (error) {
    console.error('Get suspicious activity error:', error);
    res.status(500).json({ error: 'Failed to get suspicious activity' });
  }
});

export default router;
