// ============================================================
// MiniMax Relay Platform - Logger Middleware
// ============================================================

import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { getConfig } from '../config';

// Create logger instance
const createLogger = () => {
  const config = getConfig().getLoggingConfig();

  const formats = [
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
  ];

  if (config.format === 'json') {
    formats.push(winston.format.json());
  } else {
    formats.push(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    );
  }

  return winston.createLogger({
    level: config.level,
    format: winston.format.combine(...formats),
    transports: [new winston.transports.Console()],
  });
};

let loggerInstance: winston.Logger | null = null;

function getLogger(): winston.Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger();
  }
  return loggerInstance;
}

/**
 * Request logging middleware
 */
export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const logger = getLogger();
  const start = Date.now();

  // Log request
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
    return originalSend.call(this, body);
  };

  next();
}

/**
 * Error logging middleware
 */
export function errorLoggerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const logger = getLogger();
  logger.error(`Error: ${err.message}`, {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });
  next(err);
}

export { getLogger };
