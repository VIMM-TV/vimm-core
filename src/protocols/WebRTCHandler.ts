import { ProtocolHandler, StreamStats } from './ProtocolHandler';
import { EventEmitter } from 'events';

interface PeerConnection {
  connection: RTCPeerConnection;
  stream: MediaStream;
  timestamp: number;
}

export class WebRTCHandler implements ProtocolHandler {
  private activeStreams: Map<string, Set<PeerConnection>>;
  private events: EventEmitter;
  private iceServers: RTCIceServer[];

  constructor() {
    this.activeStreams = new Map();
    this.events = new EventEmitter();
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' }
    ];
  }

  async initialize(streamId: string): Promise<void> {
    if (!this.activeStreams.has(streamId)) {
      this.activeStreams.set(streamId, new Set());
      console.log(`WebRTC stream initialized: ${streamId}`);
    }
  }

  async stop(streamId: string): Promise<void> {
    const connections = this.activeStreams.get(streamId);
    if (connections) {
      for (const peer of connections) {
        await this.disconnectPeer(peer);
      }
      this.activeStreams.delete(streamId);
      console.log(`WebRTC stream stopped: ${streamId}`);
    }
  }

  getStreamUrl(streamId: string): string {
    return `webrtc://${process.env.SERVER_HOST}/${streamId}`;
  }

  getStatus(streamId: string): 'active' | 'inactive' | 'error' {
    const connections = this.activeStreams.get(streamId);
    if (!connections) return 'inactive';
    return connections.size > 0 ? 'active' : 'inactive';
  }

  async setQuality(streamId: string, quality: string): Promise<void> {
    const connections = this.activeStreams.get(streamId);
    if (connections) {
      for (const peer of connections) {
        await this.updatePeerQuality(peer, quality);
      }
    }
  }

  async handleNewViewer(streamId: string): Promise<RTCSessionDescriptionInit> {
    const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
    
    // Set up event handlers
    this.setupPeerConnectionHandlers(peerConnection, streamId);
  
    // Create and store the connection
    const connections = this.activeStreams.get(streamId);
    if (connections) {
      connections.add({
        connection: peerConnection,
        stream: null!,
        timestamp: Date.now()
      });
    }
  
    // Create offer
    const offer = await peerConnection.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true
    });
    await peerConnection.setLocalDescription(offer);
  
    // Return the offer as RTCSessionDescriptionInit
    return {
      type: offer.type,
      sdp: offer.sdp
    };
  }

  private setupPeerConnectionHandlers(pc: RTCPeerConnection, streamId: string): void {
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.events.emit('iceCandidate', {
          streamId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state change: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected') {
        this.handlePeerDisconnect(pc, streamId);
      }
    };

    pc.ontrack = (event) => {
      this.events.emit('track', {
        streamId,
        track: event.track,
        streams: event.streams
      });
    };
  }

  private async disconnectPeer(peer: PeerConnection): Promise<void> {
    peer.connection.close();
    if (peer.stream) {
      peer.stream.getTracks().forEach(track => track.stop());
    }
  }

  private async updatePeerQuality(peer: PeerConnection, quality: string): Promise<void> {
    // Implement quality update logic using RTCRtpSender parameters
    const videoSender = peer.connection
      .getSenders()
      .find(sender => sender.track?.kind === 'video');

    if (videoSender) {
      const parameters = videoSender.getParameters();
      // Update encoding parameters based on quality
      // This is a simplified example
      const qualitySettings = this.getQualitySettings(quality);
      if (parameters.encodings?.[0]) {
        parameters.encodings[0].maxBitrate = qualitySettings.bitrate;
        await videoSender.setParameters(parameters);
      }
    }
  }

  private getQualitySettings(quality: string): { bitrate: number } {
    const settings = {
      'low': { bitrate: 800000 },    // 800kbps
      'medium': { bitrate: 1500000 }, // 1.5Mbps
      'high': { bitrate: 3000000 },   // 3Mbps
    };
    return settings[quality as keyof typeof settings] || settings.medium;
  }

  private handlePeerDisconnect(pc: RTCPeerConnection, streamId: string): void {
    const connections = this.activeStreams.get(streamId);
    if (connections) {
      for (const peer of connections) {
        if (peer.connection === pc) {
          this.disconnectPeer(peer);
          connections.delete(peer);
          break;
        }
      }
    }
  }
  
  async cleanup(): Promise<void> {
    // Stop all active streams
    for (const [streamId] of this.activeStreams) {
      await this.stop(streamId);
    }

    // Clear all event listeners and connections
    this.events.removeAllListeners();
    this.activeStreams.clear();
  }
}