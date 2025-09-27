const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ThumbnailGenerator {
    constructor(config) {
        this.ffmpegPath = '/usr/bin/ffmpeg';
        this.config = config || {
            maxResolution: '640x360',
            quality: 2,
            interval: 5 * 60 * 1000, // 5 minutes in milliseconds
            thumbnailDir: './media/thumbnails'
        };
        
        // Ensure thumbnail directory exists
        this.ensureThumbnailDirectory();
    }

    ensureThumbnailDirectory() {
        if (!fs.existsSync(this.config.thumbnailDir)) {
            fs.mkdirSync(this.config.thumbnailDir, { recursive: true });
            console.log(`Created thumbnail directory: ${this.config.thumbnailDir}`);
        }
    }

    /**
     * Generate a thumbnail for a specific stream
     * @param {string} streamId - The stream ID
     * @param {string} hiveAccount - The Hive account name for the stream
     * @returns {Promise<boolean>} - Success status
     */
    async generateThumbnail(streamId, hiveAccount) {
        return new Promise((resolve) => {
            try {
                const streamDir = path.join('./media/live', streamId);
                const sourceDir = path.join(streamDir, 'source');
                
                // Check if the stream source directory exists
                if (!fs.existsSync(sourceDir)) {
                    console.log(`Stream source directory not found for ${streamId}: ${sourceDir}`);
                    return resolve(false);
                }

                // Check if there are recent segment files
                const segmentFiles = fs.readdirSync(sourceDir)
                    .filter(file => file.endsWith('.ts'))
                    .sort();
                
                if (segmentFiles.length === 0) {
                    console.log(`No segment files found for stream ${streamId}`);
                    return resolve(false);
                }

                // Use the most recent segment file
                const latestSegment = segmentFiles[segmentFiles.length - 1];
                const segmentPath = path.join(sourceDir, latestSegment);
                
                // Create thumbnail filename with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const thumbnailFilename = `${streamId}_${timestamp}.jpg`;
                const thumbnailPath = path.join(this.config.thumbnailDir, thumbnailFilename);
                
                // Also create a "current" thumbnail that's always the latest
                const currentThumbnailPath = path.join(this.config.thumbnailDir, `${streamId}_current.jpg`);

                console.log(`Generating thumbnail for stream ${streamId} from segment: ${latestSegment}`);

                // FFmpeg command to extract thumbnail
                const ffmpegArgs = [
                    '-i', segmentPath,
                    '-ss', '1', // Skip first second to avoid black frames
                    '-vframes', '1', // Extract only one frame
                    '-vf', `scale=${this.config.maxResolution}:force_original_aspect_ratio=decrease,pad=${this.config.maxResolution}:(ow-iw)/2:(oh-ih)/2`,
                    '-q:v', this.config.quality.toString(), // Quality setting (1-31, lower is better)
                    '-y', // Overwrite existing files
                    thumbnailPath
                ];

                console.log('Running FFmpeg command:', this.ffmpegPath, ffmpegArgs.join(' '));

                const ffmpeg = spawn(this.ffmpegPath, ffmpegArgs);
                
                let errorOutput = '';
                
                ffmpeg.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                ffmpeg.on('close', (code) => {
                    if (code === 0) {
                        console.log(`Thumbnail generated successfully for stream ${streamId}: ${thumbnailFilename}`);
                        
                        // Copy to current thumbnail
                        try {
                            fs.copyFileSync(thumbnailPath, currentThumbnailPath);
                            console.log(`Updated current thumbnail for stream ${streamId}`);
                        } catch (copyError) {
                            console.error(`Failed to update current thumbnail: ${copyError.message}`);
                        }
                        
                        // Clean up old thumbnails for this stream (keep only last 5)
                        this.cleanupOldThumbnails(streamId);
                        
                        resolve(true);
                    } else {
                        console.error(`FFmpeg exited with code ${code} for stream ${streamId}`);
                        console.error('FFmpeg error output:', errorOutput);
                        resolve(false);
                    }
                });

                ffmpeg.on('error', (error) => {
                    console.error(`FFmpeg spawn error for stream ${streamId}:`, error);
                    resolve(false);
                });

            } catch (error) {
                console.error(`Error generating thumbnail for stream ${streamId}:`, error);
                resolve(false);
            }
        });
    }

    /**
     * Clean up old thumbnails for a stream, keeping only the most recent ones
     * @param {string} streamId - The stream ID
     * @param {number} keepCount - Number of thumbnails to keep (default: 5)
     */
    cleanupOldThumbnails(streamId, keepCount = 5) {
        try {
            const thumbnailFiles = fs.readdirSync(this.config.thumbnailDir)
                .filter(file => file.startsWith(`${streamId}_`) && !file.endsWith('_current.jpg'))
                .map(file => ({
                    name: file,
                    path: path.join(this.config.thumbnailDir, file),
                    stats: fs.statSync(path.join(this.config.thumbnailDir, file))
                }))
                .sort((a, b) => b.stats.mtime - a.stats.mtime); // Sort by modification time (newest first)

            // Remove old thumbnails if we have more than keepCount
            if (thumbnailFiles.length > keepCount) {
                const filesToDelete = thumbnailFiles.slice(keepCount);
                
                filesToDelete.forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                        console.log(`Deleted old thumbnail: ${file.name}`);
                    } catch (deleteError) {
                        console.error(`Failed to delete thumbnail ${file.name}:`, deleteError.message);
                    }
                });
            }
        } catch (error) {
            console.error(`Error cleaning up thumbnails for stream ${streamId}:`, error);
        }
    }

    /**
     * Generate thumbnails for all active streams
     * @param {Array} activeStreams - Array of active stream objects with streamID and hiveAccount
     * @returns {Promise<Object>} - Results object with success/failure counts
     */
    async generateThumbnailsForActiveStreams(activeStreams) {
        console.log(`Starting thumbnail generation for ${activeStreams.length} active streams`);
        
        const results = {
            total: activeStreams.length,
            successful: 0,
            failed: 0,
            details: []
        };

        // Process streams in parallel (but limit concurrency to avoid overwhelming the system)
        const concurrency = 3;
        const chunks = [];
        
        for (let i = 0; i < activeStreams.length; i += concurrency) {
            chunks.push(activeStreams.slice(i, i + concurrency));
        }

        for (const chunk of chunks) {
            const promises = chunk.map(async (stream) => {
                const success = await this.generateThumbnail(stream.streamID, stream.hiveAccount);
                
                const result = {
                    streamId: stream.streamID,
                    hiveAccount: stream.hiveAccount,
                    success: success,
                    timestamp: new Date().toISOString()
                };

                if (success) {
                    results.successful++;
                } else {
                    results.failed++;
                }

                results.details.push(result);
                return result;
            });

            await Promise.all(promises);
        }

        console.log(`Thumbnail generation completed: ${results.successful} successful, ${results.failed} failed`);
        return results;
    }

    /**
     * Get the current thumbnail path for a stream
     * @param {string} streamId - The stream ID
     * @returns {string|null} - Path to current thumbnail or null if not found
     */
    getCurrentThumbnailPath(streamId) {
        const currentThumbnailPath = path.join(this.config.thumbnailDir, `${streamId}_current.jpg`);
        
        if (fs.existsSync(currentThumbnailPath)) {
            return currentThumbnailPath;
        }
        
        return null;
    }

    /**
     * Clean up thumbnails for offline streams
     * @param {Array} offlineStreamIds - Array of stream IDs that are no longer active
     */
    cleanupOfflineStreamThumbnails(offlineStreamIds) {
        console.log(`Cleaning up thumbnails for ${offlineStreamIds.length} offline streams`);
        
        offlineStreamIds.forEach(streamId => {
            try {
                const thumbnailFiles = fs.readdirSync(this.config.thumbnailDir)
                    .filter(file => file.startsWith(`${streamId}_`));
                
                thumbnailFiles.forEach(file => {
                    const filePath = path.join(this.config.thumbnailDir, file);
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted thumbnail for offline stream: ${file}`);
                    } catch (deleteError) {
                        console.error(`Failed to delete thumbnail ${file}:`, deleteError.message);
                    }
                });
            } catch (error) {
                console.error(`Error cleaning up thumbnails for stream ${streamId}:`, error);
            }
        });
    }

    /**
     * Start the thumbnail generation scheduler
     * @param {Function} getActiveStreamsCallback - Function that returns active streams
     */
    startScheduler(getActiveStreamsCallback) {
        console.log(`Starting thumbnail generation scheduler (interval: ${this.config.interval / 1000} seconds)`);
        
        const runThumbnailGeneration = async () => {
            try {
                const activeStreams = await getActiveStreamsCallback();
                
                if (activeStreams && activeStreams.length > 0) {
                    await this.generateThumbnailsForActiveStreams(activeStreams);
                } else {
                    console.log('No active streams found for thumbnail generation');
                }
            } catch (error) {
                console.error('Error in thumbnail generation scheduler:', error);
            }
        };

        // Run immediately on start
        runThumbnailGeneration();
        
        // Then run on interval
        const intervalId = setInterval(runThumbnailGeneration, this.config.interval);
        
        console.log('Thumbnail generation scheduler started');
        return intervalId;
    }
}

module.exports = ThumbnailGenerator;
