// ============================================================
// MiniMax Relay Platform - API Key Extraction Utility
// ============================================================

import { Request } from 'express';
import { getConfig } from '../config';

/**
 * Extract API key from request header (for relay platforms)
 * Supports:
 * 1. Custom header defined in relay config (e.g., x-api-key)
 * 2. Authorization: Bearer <token>
 * 3. Query parameter: ?api_key=<token>
 */
export function extractApiKey(req: Request): string | undefined {
  const config = getConfig();
  const headerName = config.getRelayConfig().api_key_header;

  if (headerName && req.headers[headerName.toLowerCase()]) {
    return req.headers[headerName.toLowerCase()] as string;
  }

  // Also check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return undefined;
}
