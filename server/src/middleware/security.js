import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { getPool } from '../database/connection.js';

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// CSRF protection
export const csrfProtection = (req, res, next) => {
  const csrfToken = req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (req.method === 'GET') {
    // Generate CSRF token for GET requests
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    res.setHeader('X-CSRF-Token', req.session.csrfToken);
    return next();
  }

  // Validate CSRF token for non-GET requests
  if (!csrfToken || csrfToken !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};

// Input sanitization
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/[<>]/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

// IP whitelist/blacklist
export const ipFilter = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const pool = getPool();

  try {
    // Check if IP is blacklisted
    const blacklistResult = await pool.query(
      'SELECT * FROM ip_blacklist WHERE ip = $1 AND active = TRUE',
      [ip]
    );

    if (blacklistResult.rows.length > 0) {
      return res.status(403).json({ error: 'IP address is blocked' });
    }

    // Check if IP is whitelisted (if whitelist is enabled)
    const whitelistResult = await pool.query(
      'SELECT * FROM ip_whitelist WHERE ip = $1 AND active = TRUE'
    );

    const whitelistEnabled = await pool.query(
      'SELECT value FROM settings WHERE key = $1',
      ['ip_whitelist_enabled']
    );

    if (whitelistEnabled.rows[0]?.value === 'true' && whitelistResult.rows.length === 0) {
      return res.status(403).json({ error: 'IP address not whitelisted' });
    }

    next();
  } catch (error) {
    console.error('IP filter error:', error);
    next(); // Continue on error to not break the app
  }
};

// Account lockout after failed attempts
export const accountLockout = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const pool = getPool();

  try {
    // Check for too many failed attempts
    const failedAttempts = await pool.query(
      `SELECT COUNT(*) as count FROM failed_login_attempts 
       WHERE ip = $1 AND created_at >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'`,
      [ip]
    );

    if (parseInt(failedAttempts.rows[0].count) >= 5) {
      return res.status(429).json({ 
        error: 'Too many failed attempts. Please wait 15 minutes.' 
      });
    }

    next();
  } catch (error) {
    console.error('Account lockout error:', error);
    next();
  }
};

// Session security
export const sessionSecurity = (req, res, next) => {
  // Regenerate session ID periodically
  if (req.session && !req.session.lastRegeneration) {
    req.session.lastRegeneration = Date.now();
  } else if (req.session && Date.now() - req.session.lastRegeneration > 300000) {
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.lastRegeneration = Date.now();
      next();
    });
    return;
  }

  // Check session age
  if (req.session && req.session.createdAt) {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - req.session.createdAt > maxAge) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ error: 'Session expired' });
    }
  }

  next();
};

// Suspicious activity detection
export const detectSuspiciousActivity = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const pool = getPool();

  if (!userId) return next();

  try {
    // Check for login from new location
    const recentLogins = await pool.query(
      `SELECT DISTINCT ip FROM login_history 
       WHERE user_id = $1 
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    const knownIPs = new Set(recentLogins.rows.map(row => row.ip));
    if (!knownIPs.has(ip) && knownIPs.size > 0) {
      // Log suspicious login
      await pool.query(
        `INSERT INTO security_events (user_id, ip, event_type, user_agent, details)
         VALUES ($1, $2, 'new_location_login', $3, $4)`,
        [userId, ip, userAgent, JSON.stringify({ knownIPs: Array.from(knownIPs) })]
      );
    }

    // Check for rapid requests from same user
    const recentRequests = await pool.query(
      `SELECT COUNT(*) as count FROM api_requests 
       WHERE user_id = $1 
       AND ip = $2 
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'`,
      [userId, ip]
    );

    if (parseInt(recentRequests.rows[0].count) > 100) {
      await pool.query(
        `INSERT INTO security_events (user_id, ip, event_type, user_agent, details)
         VALUES ($1, $2, 'rate_limit_exceeded', $3, $4)`,
        [userId, ip, userAgent, JSON.stringify({ count: recentRequests.rows[0].count })]
      );
    }

    next();
  } catch (error) {
    console.error('Suspicious activity detection error:', error);
    next();
  }
};

// API request logging
export const logApiRequest = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const pool = getPool();

  // Store original json method
  const originalJson = res.json;

  res.json = function(data) {
    // Log the request
    pool.query(
      `INSERT INTO api_requests (user_id, ip, method, path, user_agent, status_code, response_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId || null,
        ip,
        req.method,
        req.path,
        userAgent || null,
        res.statusCode,
        Date.now() - req.startTime
      ]
    ).catch(err => console.error('API request logging error:', err));

    originalJson.call(this, data);
  };

  req.startTime = Date.now();
  next();
};

// Password strength validation
export const validatePasswordStrength = (password) => {
  const errors = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password is too common');
  }

  return {
    valid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

const calculatePasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= 12) strength += 20;
  if (password.length >= 16) strength += 10;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 15;
  if (password.length >= 20) strength += 10;

  return Math.min(strength, 100);
};

// Geo-blocking
export const geoBlock = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const pool = getPool();

  try {
    // Get blocked countries
    const blockedCountries = await pool.query(
      'SELECT country_code FROM geo_blocked_countries WHERE active = TRUE'
    );

    if (blockedCountries.rows.length === 0) {
      return next();
    }

    // In a real implementation, you would use a geo-IP service
    // For now, we'll skip actual geo-location
    next();
  } catch (error) {
    console.error('Geo-block error:', error);
    next();
  }
};

// Admin only middleware
export const adminOnly = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const pool = getPool();

  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Failed to verify admin access' });
  }
};

// Secure file upload validation
export const validateFileUpload = (req, res, next) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];

  const maxSize = 10 * 1024 * 1024; // 10MB

  if (req.file) {
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'File size exceeds limit' });
    }
  }

  next();
};

// Rate limiting configurations
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress;
    }
  });
};

// Strict rate limiting for sensitive operations
export const strictRateLimiter = createRateLimiter(15 * 60 * 1000, 5);
export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 10);
export const apiRateLimiter = createRateLimiter(60 * 1000, 1000);
