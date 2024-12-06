export interface StreamConfig {
  id: string;
  key: string;
  protocol: 'webrtc' | 'hls' | 'rtmp';
  quality: QualityProfile;
  metadata: StreamMetadata;
}

export interface QualityProfile {
  resolution: string;
  bitrate: number;
  fps: number;
  hardware?: 'cpu' | 'nvenc';
}

export interface StreamMetadata {
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  hiveUsername: string;
  timestamp: number;
  status?: 'online' | 'offline';
}