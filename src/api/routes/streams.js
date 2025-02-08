const express = require('express');
const router = express.Router();
const mediaServer = require('../../server/nms-instance');
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

        // Get NMS instance and sessions
        const nms = mediaServer.getInstance();
        const sessions = nms.getSession();
        
        // Initialize empty array for active streams
        let activeStreams = [];

        if (!sessions) {
            return res.json({
                streams: [],
                pagination: {
                    currentPage: page,
                    totalPages: 0,
                    totalStreams: 0
                }
            });
        }

        // Convert sessions object to array and process each session
        activeStreams = await Promise.all(
            Object.entries(sessions)
                .filter(([sessionId, session]) => {
                    // A session is considered active if it has a pushStream or publishStream
                    const isActive = session.pushStream || session.publishStream;
                    return isActive;
                })
                .map(async ([sessionId, session]) => {
                    try {
                        // Get user data associated with this stream
                        const userData = await getUserByStreamId(sessionId);
                        
                        if (!userData) {
                            return null;
                        }

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
                                description: userData.streamDescription || '',
                                language: userData.streamLanguage,
                                category: userData.streamCategory,
                                tags: userData.streamTags || [],
                                startTime: session.startTime || Date.now(),
                                viewers: session.viewers || 0,
                                thumbnail: `/thumbnails/${sessionId}.jpg`,
                                isLive: true,
                                streamPath,
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
                                }
                            };
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

        // Calculate pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const totalStreams = activeStreams.length;
        const totalPages = Math.ceil(totalStreams / limit);

        // Return paginated results
        res.json({
            streams: activeStreams.slice(startIndex, endIndex),
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalStreams: totalStreams,
                limit: limit
            }
        });

    } catch (error) {
        console.error('Error in /api/streams:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch active streams'
        });
    }
});

/**
 * GET /api/streams/:streamId
 * Returns detailed information about a specific stream
 */
router.get('/:streamId', async (req, res) => {
    try {
        const { streamId } = req.params;
        const nms = mediaServer.getInstance();
        const sessions = nms.getSession();

        if (!sessions || !sessions[streamId]) {
            return res.status(404).json({
                error: 'Stream not found',
                message: `No active stream found with ID: ${streamId}`
            });
        }

        const session = sessions[streamId];
        const userData = await getUserByStreamId(streamId);

        if (!userData) {
            return res.status(404).json({
                error: 'Stream metadata not found',
                message: 'Unable to find user data for this stream'
            });
        }

        const streamPath = session.pushStream ? 
            session.pushStream.streamPath :
            (session.publishStream ? session.publishStream.streamPath : null);

        const streamData = {
            id: streamId,
            username: userData.hiveAccount,
            title: userData.streamTitle || 'Untitled Stream',
            description: userData.streamDescription || '',
            language: userData.streamLanguage,
            category: userData.streamCategory,
            tags: userData.streamTags || [],
            startTime: session.startTime || Date.now(),
            viewers: session.viewers || 0,
            thumbnail: `/thumbnails/${streamId}.jpg`,
            isLive: true,
            streamPath,
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
            }
        };

        res.json(streamData);

    } catch (error) {
        console.error(`Error fetching stream ${req.params.streamId}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch stream details'
        });
    }
});

router.get('/path/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        const { type } = req.query; // 'hiveAccount' or 'streamKey'
        
        let streamId;
        if (type === 'hiveAccount') {
            // Logic to fetch stream ID by hiveAccount
            streamId = await getStreamByHiveAccount(identifier);
        } else if (type === 'streamKey') {
            // Logic to fetch stream ID by streamKey
            streamId = await getStreamIdByStreamKey(identifier);
        } else {
            return res.status(400).json({ error: 'Invalid identifier type' });
        }
        
        if (!streamId) {
            return res.status(404).json({ error: 'Stream not found' });
        }
        
        // Return the RTMP stream path/ID
        res.json({
            streamId: streamId.streamID,
            rtmpPath: `rtmp://${process.env.SERVER_IP || 'localhost'}/live/${streamId.streamID}`
        });
    } catch (error) {
        console.error('Error fetching stream:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;