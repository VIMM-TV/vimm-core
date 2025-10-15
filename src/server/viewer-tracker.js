const StreamKey = require('../db/models/streamKey');

/**
 * Viewer Tracker Module
 * Tracks active viewers by monitoring HLS segment requests
 */
class ViewerTracker {
    constructor() {
        // Map of streamId -> Map of viewerIp -> lastActivity timestamp
        this.activeViewers = new Map();
        
        // Configuration
        this.VIEWER_TIMEOUT = 30000; // 30 seconds - if no activity, viewer is considered gone
        this.UPDATE_INTERVAL = 10000; // Update database every 10 seconds
        this.CLEANUP_INTERVAL = 15000; // Cleanup stale viewers every 15 seconds
        
        // Start background tasks
        this.startPeriodicUpdates();
        this.startPeriodicCleanup();
    }

    /**
     * Record viewer activity for a stream
     * @param {string} streamId - The stream ID
     * @param {string} viewerIp - The viewer's IP address
     */
    recordActivity(streamId, viewerIp) {
        if (!streamId || !viewerIp) return;

        // Get or create the viewer map for this stream
        if (!this.activeViewers.has(streamId)) {
            this.activeViewers.set(streamId, new Map());
        }

        const streamViewers = this.activeViewers.get(streamId);
        streamViewers.set(viewerIp, Date.now());
    }

    /**
     * Get the current viewer count for a stream
     * @param {string} streamId - The stream ID
     * @returns {number} Current viewer count
     */
    getViewerCount(streamId) {
        if (!this.activeViewers.has(streamId)) {
            return 0;
        }

        const streamViewers = this.activeViewers.get(streamId);
        const now = Date.now();
        let activeCount = 0;

        // Count only viewers who were active within the timeout period
        for (const [ip, lastActivity] of streamViewers.entries()) {
            if (now - lastActivity < this.VIEWER_TIMEOUT) {
                activeCount++;
            }
        }

        return activeCount;
    }

    /**
     * Get viewer counts for all active streams
     * @returns {Object} Map of streamId -> viewerCount
     */
    getAllViewerCounts() {
        const counts = {};
        
        for (const [streamId, viewers] of this.activeViewers.entries()) {
            counts[streamId] = this.getViewerCount(streamId);
        }

        return counts;
    }

    /**
     * Remove stale viewers who haven't been active recently
     */
    cleanupStaleViewers() {
        const now = Date.now();
        let totalCleaned = 0;

        for (const [streamId, viewers] of this.activeViewers.entries()) {
            const staleViewers = [];

            // Find stale viewers
            for (const [ip, lastActivity] of viewers.entries()) {
                if (now - lastActivity >= this.VIEWER_TIMEOUT) {
                    staleViewers.push(ip);
                }
            }

            // Remove stale viewers
            staleViewers.forEach(ip => {
                viewers.delete(ip);
                totalCleaned++;
            });

            // Remove stream entry if no viewers remain
            if (viewers.size === 0) {
                this.activeViewers.delete(streamId);
            }
        }

        if (totalCleaned > 0) {
            console.log(`[ViewerTracker] Cleaned up ${totalCleaned} stale viewer(s)`);
        }
    }

    /**
     * Update viewer counts in the database
     */
    async updateDatabase() {
        try {
            const counts = this.getAllViewerCounts();
            const streamIds = Object.keys(counts);

            if (streamIds.length === 0) {
                return; // No active streams
            }

            // Batch update all streams
            const updates = streamIds.map(streamId => 
                StreamKey.update(
                    { viewerCount: counts[streamId] },
                    { 
                        where: { 
                            streamID: streamId,
                            isLive: true 
                        } 
                    }
                )
            );

            await Promise.all(updates);
            
            console.log(`[ViewerTracker] Updated viewer counts for ${streamIds.length} stream(s)`);
        } catch (error) {
            console.error('[ViewerTracker] Error updating database:', error);
        }
    }

    /**
     * Start periodic database updates
     */
    startPeriodicUpdates() {
        setInterval(() => {
            this.updateDatabase();
        }, this.UPDATE_INTERVAL);

        console.log(`[ViewerTracker] Started periodic database updates (every ${this.UPDATE_INTERVAL}ms)`);
    }

    /**
     * Start periodic cleanup of stale viewers
     */
    startPeriodicCleanup() {
        setInterval(() => {
            this.cleanupStaleViewers();
        }, this.CLEANUP_INTERVAL);

        console.log(`[ViewerTracker] Started periodic cleanup (every ${this.CLEANUP_INTERVAL}ms)`);
    }

    /**
     * Remove all viewers for a stream (when stream goes offline)
     * @param {string} streamId - The stream ID
     */
    clearStream(streamId) {
        if (this.activeViewers.has(streamId)) {
            this.activeViewers.delete(streamId);
            console.log(`[ViewerTracker] Cleared all viewers for stream ${streamId}`);
        }
    }

    /**
     * Get debug information
     * @returns {Object} Debug info
     */
    getDebugInfo() {
        const info = {
            totalStreams: this.activeViewers.size,
            streams: {}
        };

        for (const [streamId, viewers] of this.activeViewers.entries()) {
            info.streams[streamId] = {
                totalViewers: viewers.size,
                activeViewers: this.getViewerCount(streamId)
            };
        }

        return info;
    }
}

// Export singleton instance
module.exports = new ViewerTracker();
