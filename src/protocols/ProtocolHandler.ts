import { StreamConfig } from '../types';

export interface ProtocolHandler {
  initialize(streamId: string): Promise<void>;
  stop(streamId: string): Promise<void>;
  getStreamUrl(streamId: string): string;
  getStatus(streamId: string): 'active' | 'inactive' | 'error';
  cleanup(): Promise<void>;  // Add cleanup method to interface
}

export interface StreamStats {
  bitrate: number;
  fps: number;
  viewers: number;
  uptime: number;
  dropped_frames?: number;
  latency?: number;
}