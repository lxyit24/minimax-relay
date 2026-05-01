// ============================================================
// MiniMax Relay Platform - Authentication Middleware
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config';

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
}

/**
 * API Key authentication middleware
 * Accepts API key in header: Authorization: Bearer <key>
 * Or via query param: ?api_key=<key>
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const config = getConfig();
  const validApiKey = config.getMiniMaxConfig().api_key;

  // Get API key from Authorization header
  const authHeader = req.headers.authorization;
  let apiKey: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  } else if (authHeader) {
    apiKey = authHeader;
  }

  // Fallback to query parameter
  if (!apiKey) {
    apiKey = req.query.api_key as string;
  }

  // For now, we validate against the configured API key
  // In a multi-tenant system, you'd validate against a database of keys
  if (!apiKey) {
    res.status(401).json({
      error: {
        message: 'Missing API key',
        type: 'authentication_error',
        code: 401,
      },
    });
    return;
  }

  // Store the API key in the request for downstream use
  req.apiKey = apiKey;

  // For now, allow all requests with a non-empty key
  // In production, you'd validate against a key database
  next();
}

/**
 * Optional auth - doesn't fail if no key provided
 * Used for endpoints that work with or without auth
 */
export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    req.apiKey = authHeader.substring(7);
  } else if (authHeader) {
    req.apiKey = authHeader;
  } else {
    req.apiKey = req.query.api_key as string;
  }

  next();
}
