import express from 'express';
import cors from 'cors';
import { AuthManager } from '../auth/AuthManager';
import { createLogger } from '../utils/logger';

const logger = createLogger();

export class HttpServer {
  private app: express.Application;
  private authManager: AuthManager;
  private port: number;

  constructor(authManager: AuthManager) {
    this.app = express();
    this.authManager = authManager;
    this.port = parseInt(process.env.HTTP_PORT || '3000');

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes() {
    // Generate stream key endpoint
    this.app.post('/api/stream-key', async (req, res) => {
      try {
        const { username, signature, message } = req.body;

        if (!username || !signature) {
          return res.status(400).json({ 
            error: 'Missing required fields: username and signature' 
          });
        }

        logger.debug('Auth attempt details:', { 
          username, 
          message: message || 'vimm-auth',
          signatureLength: signature.length 
        });

        // Verify the user's signature
        const isValid = await this.authManager.authenticateHiveUser(username, signature, message);
        if (!isValid) {
          return res.status(401).json({ 
            error: 'Invalid authentication',
            details: 'Signature verification failed'
          });
        }

        // Generate a new stream key
        const streamKey = await this.authManager.generateStreamKey(username);
        
        logger.info(`Generated stream key for user: ${username}`);
        
        return res.json({ 
          streamKey,
          rtmpUrl: `rtmp://${process.env.SERVER_HOST}:${process.env.RTMP_BASE_PORT}/live`,
          expiresIn: '24h'
        });

      } catch (error) {
        logger.error('Error generating stream key:', error);
        return res.status(500).json({ 
          error: 'Failed to generate stream key',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Verify stream key endpoint
    this.app.post('/api/verify-key', async (req, res) => {
      try {
        const { streamKey } = req.body;

        if (!streamKey) {
          return res.status(400).json({ 
            error: 'Missing stream key' 
          });
        }

        const isValid = await this.authManager.validateStreamKey(streamKey);
        return res.json({ isValid });

      } catch (error) {
        logger.error('Error verifying stream key:', error);
        return res.status(500).json({ 
          error: 'Failed to verify stream key' 
        });
      }
    });
  }

  start() {
    this.app.listen(this.port, () => {
      logger.info(`HTTP server listening on port ${this.port}`);
    });
  }
}