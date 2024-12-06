import { EventEmitter } from 'events';
import { StreamConfig } from '../types';
import { TranscodingManager } from '../transcoding/TranscodingManager';
import { AuthManager } from '../auth/AuthManager';

export class StreamManager extends EventEmitter {
  private activeStreams: Map<string, StreamConfig>;
  private transcodingManager: TranscodingManager;

  constructor() {
    super();
    this.activeStreams = new Map();
    this.transcodingManager = new TranscodingManager();
  }

  async startStream(config: StreamConfig): Promise<boolean> {
    try {
      this.activeStreams.set(config.id, config);
      await this.transcodingManager.initializeStream(config);
      this.emit('streamStarted', config.id);
      return true;
    } catch (error) {
      this.emit('streamError', config.id, error);
      return false;
    }
  }

  async stopStream(streamId: string): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      try {
        await this.transcodingManager.stopStream(streamId);
        this.activeStreams.delete(streamId);
        this.emit('streamEnded', streamId);
      } catch (error) {
        this.emit('streamError', streamId, error);
      }
    }
  }

  getStream(streamId: string): StreamConfig | undefined {
    return this.activeStreams.get(streamId);
  }

  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }
}