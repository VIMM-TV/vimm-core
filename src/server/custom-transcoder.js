const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class CustomTranscoder {
    constructor() {
        this.ffmpegPath = '/usr/bin/ffmpeg';
        this.activeStreams = new Map();
    }

    checkNvidiaGPU() {
        try {
            require('child_process').execSync('nvidia-smi');
            console.log('NVIDIA GPU detected');
            return true;
        } catch (error) {
            console.error('NVIDIA GPU check failed:', error.message);
            return false;
        }
    }

    createMasterPlaylist(streamId, profiles) {
        const streamDir = path.join('./media/live', streamId);
        const masterPlaylistPath = path.join(streamDir, 'master.m3u8');
        let masterContent = '#EXTM3U\n';
        masterContent += '#EXT-X-VERSION:3\n\n';

        profiles.forEach(profile => {
            const bandwidth = profile.bitrate * 1000;
            masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${profile.resolution},NAME="${profile.name}"\n`;
            masterContent += `${profile.name}/index.m3u8\n\n`;
        });

        fs.writeFileSync(masterPlaylistPath, masterContent);
        console.log(`Created master playlist at ${masterPlaylistPath}`);
    }

    startTranscoding(streamId, inputUrl) {
        if (this.activeStreams.has(streamId)) {
            console.log(`Stream ${streamId} is already being transcoded`);
            return;
        }

        const hasGPU = this.checkNvidiaGPU();
        const streamDir = path.join('./media/live', streamId);

        // Ensure base directory exists
        if (!fs.existsSync(streamDir)) {
            fs.mkdirSync(streamDir, { recursive: true });
        }

        const profiles = [
            {
                name: 'source',
                resolution: '1920x1080',
                bitrate: 5000,
                encoder: hasGPU ? 'h264_nvenc' : 'libx264'
            },
            {
                name: '720p',
                resolution: '1280x720',
                bitrate: 2800,
                encoder: hasGPU ? 'h264_nvenc' : 'libx264'
            },
            {
                name: '480p',
                resolution: '854x480',
                bitrate: 1400,
                encoder: hasGPU ? 'h264_nvenc' : 'libx264'
            },
            {
                name: '360p',
                resolution: '640x360',
                bitrate: 800,
                encoder: hasGPU ? 'h264_nvenc' : 'libx264'
            }
        ];

        // Create directories for each profile
        profiles.forEach(profile => {
            const qualityDir = path.join(streamDir, profile.name);
            if (!fs.existsSync(qualityDir)) {
                fs.mkdirSync(qualityDir, { recursive: true });
            }
        });

        // Create master playlist
        this.createMasterPlaylist(streamId, profiles);

        // Build FFmpeg command
        const ffmpegArgs = [
            '-i', inputUrl,
            '-y', // Overwrite output files
            '-filter_complex', this.buildFilterComplex(profiles)
        ];

        // Add output options for each profile
        profiles.forEach((profile, index) => {
            ffmpegArgs.push(
                // Map video and audio from the filter complex
                '-map', `[v${index}]`,
                '-map', '0:a',
                // Video codec settings
                '-c:v', profile.encoder,
                ...(hasGPU ? ['-preset', 'p4', '-tune', 'hq'] : ['-preset', 'veryfast']),
                '-b:v', `${profile.bitrate}k`,
                '-maxrate', `${profile.bitrate * 1.1}k`,
                '-bufsize', `${profile.bitrate * 2}k`,
                // Audio codec settings
                '-c:a', 'aac',
                '-b:a', '128k',
                '-ar', '44100',
                // HLS settings
                '-f', 'hls',
                '-hls_time', '2',
                '-hls_list_size', '8',
                '-hls_flags', 'delete_segments+independent_segments',
                '-hls_segment_filename', path.join(streamDir, profile.name, 'segment_%d.ts'),
                path.join(streamDir, profile.name, 'index.m3u8')
            );
        });

        console.log('Starting FFmpeg with args:', ffmpegArgs.join(' '));

        const ffmpeg = spawn(this.ffmpegPath, ffmpegArgs);
        this.activeStreams.set(streamId, ffmpeg);

        ffmpeg.stdout.on('data', (data) => {
            console.log(`FFmpeg stdout: ${data}`);
        });

        ffmpeg.stderr.on('data', (data) => {
            console.log(`FFmpeg stderr: ${data}`);
        });

        ffmpeg.on('close', (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
            this.activeStreams.delete(streamId);
        });
    }

    buildFilterComplex(profiles) {
        // Create a filter chain for each profile
        const filters = profiles.map((profile, index) => {
            if (profile.name === 'source') {
                return `[0:v]split=${profiles.length}[v${index}]`;
            }
            const [width, height] = profile.resolution.split('x');
            return `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[v${index}]`;
        });
        return filters.join(';');
    }

    stopTranscoding(streamId) {
        const ffmpeg = this.activeStreams.get(streamId);
        if (ffmpeg) {
            ffmpeg.kill('SIGTERM');
            this.activeStreams.delete(streamId);
            console.log(`Stopped transcoding for stream ${streamId}`);
        }
    }
}

module.exports = CustomTranscoder;