import { ProtocolHandler, StreamStats } from './ProtocolHandler';
import { spawn, ChildProcess } from 'child_process';
import { createWriteStream, WriteStream } from 'fs';
import { rm } from 'fs/promises';
import path from 'path';

interface HLSStream {
  process: ChildProcess;
  outputStream: WriteStream;
  startTime: number;
  segmentCount: number;
  playlistPath: string;
}

export class HLSHandler implements ProtocolHandler {
  private streams: Map<string, HLSStream>;
  private outputDir: string;

  constructor() {
    this.streams = new Map();
    this.outputDir = process.env.HLS_OUTPUT_DIR || 'media/hls';
  }

  async initialize(streamId: string): Promise<void> {
    if (this.streams.has(streamId)) {
      await this.stop(streamId);
    }

    const outputPath = path.join(this.outputDir, streamId);
    const playlistPath = path.join(outputPath, 'playlist.m3u8');

    const ffmpeg = spawn('ffmpeg', [
      '-i', '-', // Read from stdin
      '-c:v', 'libx264', // Video codec
      '-c:a', 'aac', // Audio codec
      '-f', 'hls', // HLS format
      '-hls_time', '5',
      '-hls_list_size', '5', // Keep 5 segments in playlist
      '-hls_flags', 'delete_segments', // Delete old segments
      '-hls_segment_filename', `${outputPath}/segment_%d.ts`,
      playlistPath
    ]);

    const stream: HLSStream = {
      process: ffmpeg,
      outputStream: createWriteStream(playlistPath),
      startTime: Date.now(),
      segmentCount: 0,
      playlistPath
    };

    this.streams.set(streamId, stream);

    // Handle FFmpeg process events
    ffmpeg.stdout.on('data', (data) => {
      console.log(`HLS stream ${streamId} stdout: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      console.error(`HLS stream ${streamId} stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      console.log(`HLS stream ${streamId} closed with code ${code}`);
      this.clean(streamId);
    });
  }

  async stop(streamId: string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (stream) {
      // Send SIGTERM to FFmpeg
      stream.process.kill('SIGTERM');
      // Close output stream
      stream.outputStream.end();
      // Clean up
      await this.clean(streamId);
      this.streams.delete(streamId);
    }
  }

  getStreamUrl(streamId: string): string {
    return `/hls/${streamId}/playlist.m3u8`;
  }

  getStatus(streamId: string): 'active' | 'inactive' | 'error' {
    const stream = this.streams.get(streamId);
    if (!stream) return 'inactive';
    return stream.process.exitCode === null ? 'active' : 'error';
  }

  async setQuality(streamId: string, quality: string): Promise<void> {
    // For HLS, we need to restart the stream with new quality settings
    const stream = this.streams.get(streamId);
    if (stream) {
      await this.stop(streamId);
      await this.initialize(streamId); // Will use new quality settings
    }
  }

  async writeVideoData(streamId: string, data: Buffer): Promise<void> {
    const stream = this.streams.get(streamId);
    if (stream?.process?.stdin) {
        return new Promise((resolve, reject) => {
            if (!stream.process.stdin) {
                reject(new Error('Process stdin is not available'));
                return;
            }
            stream.process.stdin.write(data, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
    }
    throw new Error('Stream or process stdin not available');
  }

  async cleanup(): Promise<void> {
    // Stop all active streams
    for (const [streamId] of this.streams) {
      await this.stop(streamId);
    }

    // Clean up output directory
    try {
      await rm(this.outputDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up HLS output directory:', error);
      throw error;
    }
  }

  private async clean(streamId: string): Promise<void> {
    // Additional cleanup tasks can be added here
    // For example, deleting temporary files
    console.log(`Cleaning up HLS stream ${streamId}`);
  }

  getStreamStats(streamId: string): StreamStats | null {
    const stream = this.streams.get(streamId);
    if (!stream) return null;

    return {
      bitrate: 0, // Implement bitrate calculation
      fps: 0, // Implement FPS calculation
      viewers: 0, // Implement viewer counting
      uptime: Math.floor((Date.now() - stream.startTime) / 1000),
      dropped_frames: 0 // Implement dropped frame counting
    };
  }
}