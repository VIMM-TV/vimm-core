import { Server as NetServer } from 'net';
import NodeMediaServer from 'node-media-server';
import { EventEmitter } from 'events';
import { AuthManager } from '../auth/AuthManager';
import { StreamManager } from '../core/StreamManager';
import { createLogger } from '../utils/logger';
import { StreamConfig } from '../types';

export class RTMPHandler extends EventEmitter {
  private server: NodeMediaServer;
  private netServer: NetServer | null = null;
  private authManager: AuthManager;
  private streamManager: StreamManager;
  private logger = createLogger();
  private activeStreams: Set<string> = new Set();

  constructor(authManager: AuthManager, streamManager: StreamManager) {
    super();
    this.authManager = authManager;
    this.streamManager = streamManager;
    
    const config = {
      rtmp: {
        port: parseInt(process.env.RTMP_PORT || '1935'),
        chunk_size: 60000,
        gop_cache: true,
        ping: 60,
        ping_timeout: 30
      },
      http: {
        port: parseInt(process.env.RTMP_HTTP_PORT || '8000'),
        allow_origin: '*'
      },
      trans: {
        ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
        tasks: []
      }
    };

    this.server = new NodeMediaServer(config);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.server.on('prePublish', async (id: string, streamPath: string, args: any) => {
      try {
        const streamKey = this.extractStreamKey(streamPath);
        const isValid = await this.authManager.validateStreamKey(streamKey);

        if (!isValid) {
          this.logger.warn(`Invalid stream key attempt: ${streamPath}`);
          this.server.refuse(id);
          return;
        }

        // Create stream configuration
        const streamConfig: StreamConfig = {
          id: id,
          key: streamKey,
          protocol: 'rtmp',
          quality: {
            resolution: '1920x1080',
            bitrate: 6000000,
            fps: 30
          },
          metadata: {
            title: args.title || 'Untitled Stream',
            hiveUsername: args.username || 'unknown',
            timestamp: Date.now()
          }
        };

        // Start the stream through StreamManager
        const success = await this.streamManager.startStream(streamConfig);
        
        if (!success) {
          this.logger.error(`Failed to initialize stream: ${id}`);
          this.server.refuse(id);
          return;
        }

        this.activeStreams.add(id);
        this.logger.info(`New RTMP stream started: ${id}`);

      } catch (error) {
        this.logger.error('Error in prePublish handler:', error);
        this.server.refuse(id);
      }
    });

    this.server.on('donePublish', async (id: string, streamPath: string) => {
      try {
        if (this.activeStreams.has(id)) {
          await this.streamManager.stopStream(id);
          this.activeStreams.delete(id);
          this.logger.info(`RTMP stream ended: ${id}`);
        }
      } catch (error) {
        this.logger.error('Error in donePublish handler:', error);
      }
    });
  }

  private extractStreamKey(streamPath: string): string {
    // Expected format: /live/stream-key
    const parts = streamPath.split('/');
    return parts[parts.length - 1];
  }

  initialize(streamId: string): void {
    if (!this.server) {
      throw new Error('RTMP server not properly initialized');
    }
    this.logger.info(`Initializing RTMP handler for stream: ${streamId}`);
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.run();
      this.logger.info('RTMP server started');
      resolve();
    });
  }

  async stop(streamId: string): Promise<void> {
    if (this.activeStreams.has(streamId)) {
      // Implement graceful stream shutdown logic here
      this.activeStreams.delete(streamId);
      this.logger.info(`Stopped RTMP stream: ${streamId}`);
    }
  }

  async cleanup(): Promise<void> {
    return new Promise((resolve) => {
      // Stop all active streams
      this.activeStreams.forEach(async (streamId) => {
        await this.stop(streamId);
      });

      if (this.server) {
        this.server.stop();
        this.logger.info('RTMP server stopped');
      }
      resolve();
    });
  }
}