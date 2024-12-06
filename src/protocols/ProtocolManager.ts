import { WebRTCHandler } from './WebRTCHandler';
import { HLSHandler } from './HLSHandler';
import { RTMPHandler } from './RTMPHandler';
import { AuthManager } from '../auth/AuthManager';
import { StreamManager } from '../core/StreamManager';
import { createLogger } from '../utils/logger';

export class ProtocolManager {
  private webrtc: WebRTCHandler;
  private hls: HLSHandler;
  private rtmp: RTMPHandler;
  private logger = createLogger();

  constructor(authManager: AuthManager, streamManager: StreamManager) {
    // Initialize handlers with required dependencies
    this.webrtc = new WebRTCHandler();
    this.hls = new HLSHandler();
    this.rtmp = new RTMPHandler(authManager, streamManager);
  }

  async initialize(): Promise<void> {
    try {
      // Initialize protocol handlers
      await Promise.all([
        this.ensureDirectories(),
        this.initializeRTMP(),
        this.initializeHLS()
      ]);
      
      this.logger.info('Protocol handlers initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize protocol handlers:', error);
      throw error;
    }
  }

  private async ensureDirectories(): Promise<void> {
    // Implementation for creating necessary directories
    // This would typically create directories for HLS segments, recordings, etc.
  }

  private async initializeRTMP(): Promise<void> {
    try {
      await this.rtmp.start();
      this.logger.info('RTMP server initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RTMP server:', error);
      throw error;
    }
  }

  private async initializeHLS(): Promise<void> {
    // Implementation for HLS server initialization
  }

  initializeProtocol(protocol: string, streamId: string): void {
    switch (protocol) {
      case 'webrtc':
        this.webrtc.initialize(streamId);
        break;
      case 'hls':
        this.hls.initialize(streamId);
        break;
      case 'rtmp':
        this.rtmp.initialize(streamId);
        break;
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  stopProtocol(protocol: string, streamId: string): void {
    switch (protocol) {
      case 'webrtc':
        this.webrtc.stop(streamId);
        break;
      case 'hls':
        this.hls.stop(streamId);
        break;
      case 'rtmp':
        this.rtmp.stop(streamId);
        break;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await Promise.all([
        this.webrtc.cleanup(),
        this.hls.cleanup(),
        this.rtmp.cleanup()
      ]);
      
      this.logger.info('Protocol handlers cleaned up successfully');
    } catch (error) {
      this.logger.error('Failed to cleanup protocol handlers:', error);
      throw error;
    }
  }
}