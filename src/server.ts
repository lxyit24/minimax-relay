// ============================================================
// MiniMax Relay Platform - Express Server Setup
// ============================================================

import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { getConfig } from './config';
import { loggerMiddleware, errorLoggerMiddleware } from './middleware/logger';
import { createRateLimiter } from './middleware/ratelimit';
import chatRoutes from './routes/chat';
import imageRoutes from './routes/images';
import speechRoutes from './routes/speech';
import videoRoutes from './routes/video';
import musicRoutes from './routes/music';
import modelRoutes from './routes/models';

export function createServer(): Application {
  const app = express();
  const config = getConfig();
  const relayConfig = config.getRelayConfig();

  // Configure CORS based on relay config
  const corsOptions: CorsOptions = {
    origin: relayConfig.allowed_origins === '*' 
      ? '*' 
      : relayConfig.allowed_origins.split(',').map(s => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'openai-organization', 'openai-project'],
  };
  app.use(cors(corsOptions));
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(loggerMiddleware);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Rate limiting
  app.use(createRateLimiter());

  // API routes
  const basePath = config.getServerConfig().base_path;
  app.use(basePath, modelRoutes);
  app.use(basePath, chatRoutes);
  app.use(basePath, imageRoutes);
  app.use(basePath, speechRoutes);
  app.use(basePath, videoRoutes);
  app.use(basePath, musicRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        message: 'Not found',
        type: 'invalid_request_error',
        code: 404,
      },
    });
  });

  // Error handler
  app.use(errorLoggerMiddleware);
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: {
        message: 'Internal server error',
        type: 'api_error',
        code: 500,
      },
    });
  });

  return app;
}

export async function startServer(): Promise<void> {
  const app = createServer();
  const config = getConfig();
  const { host, port } = config.getServerConfig();

  return new Promise((resolve) => {
    app.listen(port, host, () => {
      console.log(`🚀 MiniMax Relay running at http://${host}:${port}`);
      console.log(`📡 API base path: ${config.getServerConfig().base_path}`);
      console.log(`🔑 Enabled models: ${config.getModelsConfig().enabled.join(', ')}`);
      console.log(`🔄 Relay mode: bypass_model_check=${config.getRelayConfig().bypass_model_check}`);
      resolve();
    });
  });
}
