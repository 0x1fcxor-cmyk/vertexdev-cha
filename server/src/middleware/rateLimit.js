const rateLimitMap = new Map();

// Rate limiting configuration
const RATE_LIMITS = {
  default: { windowMs: 60000, maxRequests: 100 },
  auth: { windowMs: 900000, maxRequests: 5 },
  message: { windowMs: 10000, maxRequests: 10 },
  upload: { windowMs: 3600000, maxRequests: 20 },
  command: { windowMs: 5000, maxRequests: 5 }
};

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (data.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredEntries, 60000);

export function rateLimit(type = 'default') {
  const config = RATE_LIMITS[type] || RATE_LIMITS.default;

  return (req, res, next) => {
    const identifier = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const key = `${type}:${identifier}`;
    
    const now = Date.now();
    const data = rateLimitMap.get(key);

    if (!data || data.resetTime < now) {
      // Create new window
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return next();
    }

    if (data.count >= config.maxRequests) {
      const resetIn = Math.ceil((data.resetTime - now) / 1000);
      res.setHeader('Retry-After', resetIn);
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(data.resetTime).toISOString());
      
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: resetIn,
        limit: config.maxRequests,
        window: config.windowMs
      });
    }

    // Increment counter
    data.count++;
    
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', config.maxRequests - data.count);
    res.setHeader('X-RateLimit-Reset', new Date(data.resetTime).toISOString());
    
    next();
  };
}

export function resetRateLimit(identifier, type = 'default') {
  const key = `${type}:${identifier}`;
  rateLimitMap.delete(key);
}

export function getRateLimitStatus(identifier, type = 'default') {
  const key = `${type}:${identifier}`;
  const data = rateLimitMap.get(key);
  const config = RATE_LIMITS[type] || RATE_LIMITS.default;
  
  if (!data || data.resetTime < Date.now()) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Date.now() + config.windowMs
    };
  }
  
  return {
    limit: config.maxRequests,
    remaining: config.maxRequests - data.count,
    reset: data.resetTime
  };
}
