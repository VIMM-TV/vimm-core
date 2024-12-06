import { WebRTCHandler } from './WebRTCHandler';
import { HLSHandler } from './HLSHandler';
import { RTMPHandler } from './RTMPHandler';

export class ProtocolManager {
  private webrtc: WebRTCHandler;
  private hls: HLSHandler;
  private rtmp: RTMPHandler;

  constructor() {
    this.webrtc = new WebRTCHandler();
    this.hls = new HLSHandler();
    this.rtmp = new RTMPHandler();
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
}