import dotenv from 'dotenv';
import { VIMMServer } from './Server';
import { createLogger } from './utils/logger';

// Load environment variables
dotenv.config();

// Create logger instance
const logger = createLogger();

// Create and start server
const startServer = async () => {
  try {
    const server = new VIMMServer();
    await server.start();
    logger.info('VIMM Core Server started successfully');

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM signal. Shutting down...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT signal. Shutting down...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();