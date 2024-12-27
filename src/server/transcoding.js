const { execSync } = require('child_process');

function checkNvidiaGPU() {
    try {
        execSync('nvidia-smi');
        return true;
    } catch (error) {
        return false;
    }
}

function getTranscodingConfig() {
    const hasGPU = checkNvidiaGPU();

    if (hasGPU) {
        return {
            app: 'live',
            hls: true,
            hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
            dash: false,
            handler: () => {},
            mp4: false,
            fps: 30,
            audioEncoder: "aac",
            videoEncoder: hasGPU ? "h264_nvenc" : "libx264",
            profiles: [
                {
                    name: 'source',
                    bitrate: 0,
                    profile: 'high',
                    preset: 'medium',
                    scale: null // Original size
                },
                {
                    name: '720p',
                    bitrate: 2500 * 1000, // Convert to bps
                    profile: 'main',
                    preset: hasGPU ? 'p4' : 'veryfast',
                    scale: {
                        width: 1280,
                        height: 720
                    }
                }
            ]
        };
    } else {
        // CPU-only configuration
        return {
            app: 'live',
            hls: true,
            hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
            dash: false,
            handler: () => {},
            mp4: false,
            fps: 30,
            audioEncoder: "aac",
            videoEncoder: "libx264",
            profiles: [
                {
                    name: 'source',
                    bitrate: 0,
                    profile: 'high',
                    preset: 'medium',
                    scale: null // Original size
                }
            ]
        };
    }
}

module.exports = { getTranscodingConfig };