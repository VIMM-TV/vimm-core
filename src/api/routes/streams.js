const express = require('express');
const router = express.Router();
const nms = require('../../server/nms-instance');
const { getUserByStreamId } = require('../../auth/streamkey');

/**
 * GET /api/streams
 * Returns a list of active streams with their metadata
 * Query parameters:
 * - page (optional): Page number for pagination
 * - limit (optional): Number of items per page
 * - language (optional): Filter by stream language
 * - category (optional): Filter by stream category
 */
router.get('/', async (req, res) => {
    try {
        // Get query parameters with defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const language = req.query.language;
        const category = req.query.category;

        // Get all active sessions from Node-Media-Server
        const sessions = nms.getSession();
        
        if (!sessions) {
            return res.json({
                streams: [],
                pagination: {
                    currentPage: page,
                    itemsPerPage: limit,
                    totalItems: 0,
                    totalPages: 0
                },
                timestamp: new Date().toISOString()
            });
        }

        const activeStreams = [];

        // Process each active session
        for (const [sessionId, session] of Object.entries(sessions)) {
            // Only include sessions that are actually streaming
            if (session.isStarting) {
                try {
                    // Get user data associated with this stream
                    const userData = await getUserByStreamId(sessionId);
                    
                    if (userData) {
                        // Create stream object with relevant information
                        const streamData = {
                            id: sessionId,
                            username: userData.hiveAccount,
                            title: userData.streamTitle || 'Untitled Stream',
                            language: userData.streamLanguage,
                            category: userData.streamCategory,
                            startTime: session.startTime,
                            viewers: session.viewers || 0,
                            thumbnail: `/thumbnails/${sessionId}.jpg`,
                            isLive: true,
                            quality: {
                                width: session.videoWidth || 1920,
                                height: session.videoHeight || 1080,
                                fps: session.videoFps || 30,
                                bitrate: session.videoBitrate || 0
                            }
                        };

                        // Apply filters if specified
                        if ((!language || streamData.language === language) &&
                            (!category || streamData.category === category)) {
                            activeStreams.push(streamData);
                        }
                    }
                } catch (error) {
                    console.error(`Error processing stream ${sessionId}:`, error);
                }
            }
        }

        // Sort streams by viewer count (descending)
        activeStreams.sort((a, b) => (b.viewers || 0) - (a.viewers || 0));

        // Calculate pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const totalStreams = activeStreams.length;

        // Prepare pagination metadata
        const paginationMeta = {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: totalStreams,
            totalPages: Math.ceil(totalStreams / limit)
        };

        // Return paginated results
        res.json({
            streams: activeStreams.slice(startIndex, endIndex),
            pagination: paginationMeta,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching streams:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch active streams'
        });
    }
});

module.exports = router;