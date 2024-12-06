import { StreamManager } from './core/StreamManager';
import { ProtocolManager } from './protocols/ProtocolManager';
import { MetadataManager } from './metadata/MetadataManager';
import { StreamConfig } from './types';

export class VIMMServer {
  private streamManager: StreamManager;
  private protocolManager: ProtocolManager;
  private metadataManager: MetadataManager;

  constructor() {
    this.streamManager = new StreamManager();
    this.protocolManager = new ProtocolManager();
    this.metadataManager = new MetadataManager();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.streamManager.on('streamStarted', (streamId: string) => {
      const stream = this.streamManager.getStream(streamId);
      if (stream) {
        this.protocolManager.initializeProtocol(stream.protocol, streamId);
      }
    });

    this.streamManager.on('streamEnded', (streamId: string) => {
      const stream = this.streamManager.getStream(streamId);
      if (stream) {
        this.protocolManager.stopProtocol(stream.protocol, streamId);
        this.metadataManager.deleteStreamMetadata(streamId);
      }
    });
  }

  async start(): Promise<void> {
    // Initialize server components
    console.log('VIMM Core Server starting...');
  }

  async stop(): Promise<void> {
    // Cleanup and shutdown
    console.log('VIMM Core Server stopping...');
  }
}