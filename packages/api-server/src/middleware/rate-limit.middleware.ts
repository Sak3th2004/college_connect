import rateLimit from 'express-rate-limit';
import { config } from '../config';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: {
    success: false,
    error: {
      code: 4001,
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip || 'unknown';
  },
});

// Stricter rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.authRateLimitMax,
  message: {
    success: false,
    error: {
      code: 4001,
      message: 'Too many authentication attempts, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // For auth endpoints, use IP + email (if provided)
    const email = req.body?.email || '';
    return `${req.ip}:${email}`;
  },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Very strict limiter for sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: {
      code: 4001,
      message: 'Rate limit exceeded for sensitive operation.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
