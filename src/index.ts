// ============================================================
// MiniMax Relay Platform - Entry Point
// ============================================================

import dotenv from 'dotenv';
import { initConfig } from './config';
import { startServer } from './server';
import { getLogger } from './middleware/logger';

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Initialize configuration
    const config = initConfig();
    console.log('📋 Configuration loaded');
    console.log(`   - API Base URL: ${config.minimax.base_url}`);
    console.log(`   - Enabled models: ${config.models.enabled.join(', ')}`);

    // Start the server
    await startServer();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

main();
