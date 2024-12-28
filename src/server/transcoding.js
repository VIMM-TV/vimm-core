const { execSync } = require('child_process');
const fs = require('fs');

function checkNvidiaGPU() {
  try {
      // Check if nvidia-smi is available
      execSync('nvidia-smi');
      console.log('NVIDIA GPU detected');
      return true;
  } catch (error) {
      console.error('NVIDIA GPU check failed:', error.message);
      return false;
  }
}

function getTranscodingConfig() {
    const hasGPU = checkNvidiaGPU();
    const baseConfig = {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=4:hls_list_size=5:hls_flags=delete_segments]',
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
                    vc: 'h264_nvenc',
                    ac: 'aac'
                },
                // 720p transcoded stream using NVIDIA GPU
                '720p': {
                    vc: 'h264_nvenc',
                    ac: 'aac',
                    '-vf': 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
                    '-b:v': '2500k',
                    '-b:a': '128k',
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