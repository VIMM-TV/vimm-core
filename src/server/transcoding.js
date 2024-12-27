const { execSync } = require('child_process');
const fs = require('fs');

function checkNvidiaGPU() {
    try {
        // Check if nvidia-smi is available
        execSync('nvidia-smi');
        return true;
    } catch (error) {
        return false;
    }
}

function getTranscodingConfig() {
    const hasGPU = checkNvidiaGPU();
    const baseConfig = {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        hlsKeep: false,
        handler: (id, streamPath, args) => {
          // Use the session ID for the HLS path
          args.hlsPath = `./media/live/${id}`;
          console.log('[Transcoding Handler]', `Setting HLS path for session ${id}: ${args.hlsPath}`);
      },
    };

    if (hasGPU) {
      console.log('NVIDIA GPU found, using hardware transcoding');
        // If a GPU is available, use it for transcoding
        return {
            ...baseConfig,
            profiles: {
                // High quality (source quality)
                source: {
                    codec: 'copy',
                    ac: 'copy'
                },
                // 720p transcoded stream using NVIDIA GPU
                '720p': {
                    codec: 'h264_nvenc',
                    ac: 'aac',
                    scale: '1280:720',
                    fps: 30,
                    bitrate: '2500k',
                    profile: 'main',
                    preset: 'p4',
                    args: '-rc:v vbr_hq -rc-lookahead:v 32'
                }
            }
        };
    } else {
        // CPU fallback - just pass through the original stream
        console.log('No NVIDIA GPU found, using passthrough transcoding');
        return {
            ...baseConfig,
            profiles: {
                source: {
                    codec: 'copy'
                }
            }
        };
    }
}

module.exports = { getTranscodingConfig };