const express = require('express');
const router = express.Router();
const nms = require('../../server/nms-instance');
const { getUserByStreamId } = require('../../auth/streamkey');

/**
 * GET /api/stream/:streamId/status
 * Returns detailed stream status information
 * Parameters:
 * - streamId: The unique identifier of the stream
 */
router.get('/:streamId/status', async (req, res) => {
    try {
        const { streamId } = req.params;
        
        // Get the session from Node-Media-Server
        const sessions = nms.getSession();
        
        if (!sessions) {
            return res.status(404).json({
                error: 'No active sessions',
                message: 'The streaming server has no active sessions'
            });
        }

        const session = sessions[streamId];

        if (!session) {
            return res.status(404).json({
                error: 'Stream not found',
                message: `No active stream found with ID: ${streamId}`
            });
        }

        try {
            // Get user data associated with this stream
            const userData = await getUserByStreamId(streamId);
            
            if (!userData) {
                return res.status(404).json({
                    error: 'Stream metadata not found',
                    message: 'Unable to find user data for this stream'
                });
            }

            // Calculate uptime
            const uptime = session.startTime ? Date.now() - session.startTime : 0;

            // Create detailed status response
            const streamStatus = {
                id: streamId,
                online: session.isStarting === true,
                username: userData.hiveAccount,
                title: userData.streamTitle || 'Untitled Stream',
                description: userData.streamDescription || '',
                category: userData.streamCategory,
                language: userData.streamLanguage,
                tags: userData.streamTags || [],
                statistics: {
                    viewers: session.viewers || 0,
                    uptime: uptime, // milliseconds
                    startTime: session.startTime,
                    lastActive: session.lastActivity || session.startTime
                },
                quality: {
                    width: session.videoWidth || 1920,
                    height: session.videoHeight || 1080,
                    fps: session.videoFps || 30,
                    bitrate: session.videoBitrate || 0,
                    codec: session.videoCodec || 'h264',
                    audioBitrate: session.audioBitrate || 0,
                    audioCodec: session.audioCodec || 'aac'
                },
                settings: {
                    recordStream: userData.recordStream || false,
                    chatEnabled: userData.chatEnabled !== false,
                    chatModeration: userData.chatModeration || 'standard',
                    allowReplays: userData.allowReplays !== false
                },
                thumbnail: `/thumbnails/${streamId}.jpg`,
                health: {
                    status: 'good', // Can be 'good', 'warning', or 'error'
                    droppedFrames: session.droppedFrames || 0,
                    bandwidth: session.bandwidth || 0,
                    lastHealthCheck: new Date().toISOString()
                }
            };

            res.json({
                status: streamStatus,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`Error processing stream ${streamId}:`, error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to process stream data'
            });
        }

    } catch (error) {
        console.error('Error fetching stream status:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch stream status'
        });
    }
});

module.exports = router;