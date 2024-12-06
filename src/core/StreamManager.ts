import { EventEmitter } from 'events';
import { StreamConfig } from '../types';
import { TranscodingManager } from '../transcoding/TranscodingManager';
import { AuthManager } from '../auth/AuthManager';

export class StreamManager extends EventEmitter {
  private activeStreams: Map<string, StreamConfig>;
  private transcodingManager: TranscodingManager;
  private authManager: AuthManager;

  constructor() {
    super();
    this.activeStreams = new Map();
    this.transcodingManager = new TranscodingManager();
    this.authManager = new AuthManager();
  }

  async startStream(config: StreamConfig): Promise<boolean> {
    if (await this.authManager.validateStreamKey(config.key)) {
      this.activeStreams.set(config.id, config);
      await this.transcodingManager.initializeStream(config);
      this.emit('streamStarted', config.id);
      return true;
    }
    return false;
  }

  async stopStream(streamId: string): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      await this.transcodingManager.stopStream(streamId);
      this.activeStreams.delete(streamId);
      this.emit('streamEnded', streamId);
    }
  }

  getStream(streamId: string): StreamConfig | undefined {
    return this.activeStreams.get(streamId);
  }
}