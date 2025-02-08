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

        // Get all active sessions from Node-Media-Server using getSessions() instead of getSession()
        const sessions = nms.getSessions();
        
        // Debug log to see raw session data
        console.log('Raw NMS Sessions:', JSON.stringify(sessions, null, 2));
        
        let activeStreams = [];

        if (sessions) {
            // Convert sessions object to array and process each session
            activeStreams = await Promise.all(
                Object.entries(sessions)
                    .filter(([sessionId, session]) => {
                        // A session is considered active if it has a pushStream or publishStream
                        const isActive = session.pushStream || session.publishStream;
                        console.log(`Session ${sessionId} active state:`, {
                            hasPushStream: !!session.pushStream,
                            hasPublishStream: !!session.publishStream,
                            isActive
                        });
                        return isActive;
                    })
                    .map(async ([sessionId, session]) => {
                        try {
                            // Get user data associated with this stream
                            const userData = await getUserByStreamId(sessionId);
                            
                            if (userData) {
                                // Only include streams that match filters
                                if ((!language || userData.streamLanguage === language) &&
                                    (!category || userData.streamCategory === category)) {
                                    
                                    // Get the stream path from pushStream or publishStream
                                    const streamPath = session.pushStream ? 
                                        session.pushStream.streamPath :
                                        (session.publishStream ? session.publishStream.streamPath : null);
                                        
                                    return {
                                        id: sessionId,
                                        username: userData.hiveAccount,
                                        title: userData.streamTitle || 'Untitled Stream',
                                        language: userData.streamLanguage,
                                        category: userData.streamCategory,
                                        startTime: session.startTime || Date.now(),
                                        viewers: session.viewers || 0,
                                        thumbnail: `/thumbnails/${sessionId}.jpg`,
                                        isLive: true,
                                        streamPath,
                                        quality: {
                                            width: session.videoWidth || 1920,
                                            height: session.videoHeight || 1080,
                                            fps: session.videoFps || 30,
                                            bitrate: session.videoBitrate || 0
                                        }
                                    };
                                }
                            }
                        } catch (error) {
                            console.error(`Error processing stream ${sessionId}:`, error);
                            return null;
                        }
                        return null;
                    })
            );

            // Remove null entries and sort by viewer count
            activeStreams = activeStreams
                .filter(stream => stream !== null)
                .sort((a, b) => (b.viewers || 0) - (a.viewers || 0));
        }

        // Calculate pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const totalStreams = activeStreams.length;

        res.json({
            streams: activeStreams.slice(startIndex, endIndex),
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: totalStreams,
                totalPages: Math.ceil(totalStreams / limit)
            },
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