import { StreamManager } from './core/StreamManager';
import { ProtocolManager } from './protocols/ProtocolManager';
import { MetadataManager } from './metadata/MetadataManager';
import { AuthManager } from './auth/AuthManager';
import { HttpServer } from './http/HttpServer';
import { StreamConfig, StreamMetadata } from './types';
import { createLogger } from './utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export class VIMMServer {
  private streamManager: StreamManager;
  private protocolManager: ProtocolManager;
  private metadataManager: MetadataManager;
  private authManager: AuthManager;
  private httpServer: HttpServer;
  private logger = createLogger();
  private isRunning: boolean = false;

  constructor() {
    this.authManager = new AuthManager();
    this.streamManager = new StreamManager();
    this.protocolManager = new ProtocolManager(this.authManager, this.streamManager);
    this.metadataManager = new MetadataManager();
    this.httpServer = new HttpServer(this.authManager);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle stream start events
    this.streamManager.on('streamStarted', async (streamId: string) => {
      try {
        const stream = this.streamManager.getStream(streamId);
        if (stream) {
          this.logger.info(`Initializing stream: ${streamId}`);
          await this.protocolManager.initializeProtocol(stream.protocol, streamId);
          await this.metadataManager.updateStreamMetadata(streamId, {
            ...stream.metadata,
            status: 'online' as const
          });
          this.logger.info(`Stream initialized successfully: ${streamId}`);
        } else {
          this.logger.error(`Stream config not found for stream: ${streamId}`);
        }
      } catch (error) {
        this.logger.error(`Error handling stream start for ${streamId}:`, error);
        await this.handleStreamError(streamId, error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Handle stream end events
    this.streamManager.on('streamEnded', async (streamId: string) => {
      try {
        const stream = this.streamManager.getStream(streamId);
        if (stream) {
          this.logger.info(`Cleaning up stream: ${streamId}`);
          await this.protocolManager.stopProtocol(stream.protocol, streamId);
          await this.metadataManager.updateStreamMetadata(streamId, {
            ...stream.metadata,
            status: 'offline' as const
          });
          this.logger.info(`Stream cleanup completed: ${streamId}`);
        }
      } catch (error) {
        this.logger.error(`Error handling stream end for ${streamId}:`, error);
      }
    });

    // Handle stream error events
    this.streamManager.on('streamError', async (streamId: string, error: Error) => {
      try {
        this.logger.error(`Stream error for ${streamId}:`, error);
        await this.handleStreamError(streamId, error);
      } catch (error) {
        this.logger.error(`Error handling stream error for ${streamId}:`, error);
      }
    });
  }

  private async handleStreamError(streamId: string, error: Error): Promise<void> {
    try {
      const stream = this.streamManager.getStream(streamId);
      if (stream) {
        // Stop the stream protocols
        await this.protocolManager.stopProtocol(stream.protocol, streamId);
        
        // Update metadata to reflect error state
        const errorMetadata: StreamMetadata = {
          ...stream.metadata,
          status: 'offline' as const,
          description: `${stream.metadata.description || ''}\nError: ${error.message}`
        };
        
        await this.metadataManager.updateStreamMetadata(streamId, errorMetadata);
        
        // Attempt to cleanup stream resources
        await this.streamManager.stopStream(streamId);
      }
    } catch (error) {
      this.logger.error(`Failed to handle stream error for ${streamId}:`, error);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    try {
      this.logger.info('Starting VIMM Core Server...');

      // Validate environment configuration
      this.validateConfiguration();

      // Initialize components
      await this.initializeComponents();

      // Start HTTP server
      this.httpServer.start();

      this.isRunning = true;
      this.logger.info('VIMM Core Server started successfully');
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Server is not running');
    }

    try {
      this.logger.info('Stopping VIMM Core Server...');

      // Stop all active streams
      const activeStreams = this.streamManager.getActiveStreams();
      for (const streamId of activeStreams) {
        await this.streamManager.stopStream(streamId);
      }

      // Clean up components
      await this.cleanup();

      this.isRunning = false;
      this.logger.info('VIMM Core Server stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop server:', error);
      throw error;
    }
  }

  private validateConfiguration(): void {
    const requiredEnvVars = [
      'SERVER_HOST',
      'RTMP_BASE_PORT',
      'HLS_OUTPUT_DIR',
      'HIVE_POSTING_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  private async initializeComponents(): Promise<void> {
    try {
      // Initialize storage directories
      await this.initializeStorage();

      // Initialize protocol manager
      await this.protocolManager.initialize();

      this.logger.info('All components initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize components:', error);
      throw error;
    }
  }

  private async initializeStorage(): Promise<void> {
    try {
      const directories = [
        process.env.HLS_OUTPUT_DIR || 'media/hls',
        'media/recordings',
        'logs'
      ];

      for (const dir of directories) {
        await fs.mkdir(path.resolve(dir), { recursive: true });
      }

      this.logger.info('Storage directories initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize storage directories:', error);
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // Cleanup protocols
      await this.protocolManager.cleanup();

      // Cleanup temporary files
      const tempDir = process.env.TEMP_DIR || 'media/temp';
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        await fs.mkdir(tempDir, { recursive: true });
      } catch (error) {
        this.logger.error('Error cleaning up temporary directory:', error);
      }

      this.logger.info('Cleanup completed successfully');
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
      throw error;
    }
  }

  // Public methods for server management
  getServerStatus(): {
    isRunning: boolean;
    activeStreams: number;
    uptime: number;
    startTime: number;
  } {
    const activeStreams = this.streamManager.getActiveStreams();
    return {
      isRunning: this.isRunning,
      activeStreams: activeStreams.length,
      uptime: process.uptime(),
      startTime: process.uptime() * 1000
    };
  }

  getStreamInfo(streamId: string): StreamConfig | undefined {
    return this.streamManager.getStream(streamId);
  }

  async validateStreamKey(key: string): Promise<boolean> {
    return this.authManager.validateStreamKey(key);
  }

  async createStreamKey(username: string): Promise<string> {
    return this.authManager.generateStreamKey(username);
  }
}