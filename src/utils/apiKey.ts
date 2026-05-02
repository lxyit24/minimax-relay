// ============================================================
// MiniMax Relay Platform - API Key Extraction Utility
// ============================================================

import { Request } from 'express';
import { getConfig } from '../config';
import * as fs from 'fs';
import * as path from 'path';

const DEBUG_FILE = path.join(__dirname, '../../debug.log');

function debugLog(...args: any[]) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(DEBUG_FILE, line);
}

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

  // Debug log
  const keyHeader = headerName?.toLowerCase();
  const headerValue = keyHeader ? req.headers[keyHeader] : undefined;
  const auth = req.headers.authorization;
  debugLog(`extractApiKey - headerName: ${headerName}, x-api-key: ${headerValue ? 'present' : 'missing'}, auth: ${auth ? auth.substring(0, 20) + '...' : 'missing'}`);

  if (headerName && req.headers[headerName.toLowerCase()]) {
    return req.headers[headerName.toLowerCase()] as string;
  }

  // Also check Authorization header
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }

  return undefined;
}
