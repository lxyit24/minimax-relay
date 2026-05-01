// ============================================================
// MiniMax Relay Platform - Rate Limiting Middleware
// ============================================================

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { getConfig } from '../config';

/**
 * Create rate limiting middleware based on config
 */
export function createRateLimiter() {
  const config = getConfig();
  const rateLimitConfig = config.getRateLimitConfig();

  if (!rateLimitConfig.enabled) {
    // Return a no-op middleware if rate limiting is disabled
    return (_req: Request, _res: Response, next: Function) => next();
  }

  return rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: rateLimitConfig.requests_per_minute, // requests per window
    message: {
      error: {
        message: 'Rate limit exceeded',
        type: 'rate_limit_error',
        code: 429,
      },
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use API key as rate limit key if available, otherwise use IP
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      return req.ip || 'anonymous';
    },
  });
}

/**
 * Create a stricter rate limiter for image generation
 * (images are more expensive and should be rate limited more)
 */
export function createImageRateLimiter() {
  const config = getConfig();

  return rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: Math.floor(config.getRateLimitConfig().requests_per_minute / 6), // 1/6 of normal limit
    message: {
      error: {
        message: 'Image generation rate limit exceeded',
        type: 'rate_limit_error',
        code: 429,
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      return req.ip || 'anonymous';
    },
  });
}
