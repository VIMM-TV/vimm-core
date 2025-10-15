const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const StreamKey = require('../../db/models/streamKey');
const StreamStats = require('../../db/models/streamStats');
const FollowerGrowth = require('../../db/models/followerGrowth');
const FollowedChannels = require('../../db/models/followedChannels');
const { authenticateToken } = require('../../middleware/auth');

/**
 * GET /api/streams
 * Returns a list of active streams with their metadata
 */
router.get('/', async (req, res) => {
    try {
        // Get query parameters with defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const language = req.query.language;
        const category = req.query.category;

        // Build where clause based on filters
        let whereClause = {
            streamID: { [Op.ne]: null }, // Only streams with IDs (active)
            isLive: true
        };
        
        if (language) {
            whereClause.streamLanguage = language;
        }
        
        if (category) {
            whereClause.streamCategory = category;
        }

        // Query the database directly
        const { count, rows } = await StreamKey.findAndCountAll({
            where: whereClause,
            limit: limit,
            offset: (page - 1) * limit,
            order: [['lastUsed', 'DESC']] // Sort by most recently used
        });

        // Transform data for API response
        const streams = rows.map(stream => ({
            id: stream.streamID,
            username: stream.hiveAccount,
            title: stream.streamTitle || 'Untitled Stream',
            description: stream.streamDescription || '',
            language: stream.streamLanguage,
            category: stream.streamCategory,
            startTime: stream.lastUsed,
            thumbnail: `/thumbnails/${stream.streamID}_current.jpg`,
            isLive: stream.isLive,
            streamPath: `/live/${stream.streamID}`,
            viewerCount: stream.viewerCount || 0
        }));

        // Return paginated results
        res.json({
            streams: streams,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalStreams: count,
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
        
        const stream = await StreamKey.findOne({
            where: { 
                streamID: streamId,
                isActive: true
            }
        });

        if (!stream) {
            return res.status(404).json({
                error: 'Stream not found',
                message: `No active stream found with ID: ${streamId}`
            });
        }

        const streamData = {
            id: stream.streamID,
            username: stream.hiveAccount,
            title: stream.streamTitle || 'Untitled Stream',
            description: stream.streamDescription || '',
            language: stream.streamLanguage,
            category: stream.streamCategory,
            startTime: stream.lastUsed,
            thumbnail: `/thumbnails/${stream.streamID}_current.jpg`,
            isLive: stream.isLive,
            streamPath: `/live/${stream.streamID}`,
            permlink: stream.permlink || null
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
        
        let whereClause = {};
        if (type === 'hiveAccount') {
            whereClause.hiveAccount = identifier;
        } else if (type === 'streamKey') {
            whereClause.streamKey = identifier;
        } else {
            return res.status(400).json({ error: 'Invalid identifier type' });
        }
        
        const stream = await StreamKey.findOne({
            where: whereClause
        });
        
        if (!stream || !stream.streamID) {
            return res.status(404).json({ error: 'Stream not found or not active' });
        }
        
        // Return the RTMP stream path/ID
        res.json({
            streamId: stream.streamID,
            rtmpPath: `rtmp://${process.env.SERVER_IP || 'localhost'}/live/${stream.streamID}`
        });
    } catch (error) {
        console.error('Error fetching stream:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/streams/:streamId/thumbnail
 * Returns the thumbnail for a specific stream with proper error handling
 */
router.get('/:streamId/thumbnail', async (req, res) => {
    try {
        const { streamId } = req.params;
        const fs = require('fs');
        const path = require('path');
        
        // Check if stream exists and is active
        const stream = await StreamKey.findOne({
            where: { 
                streamID: streamId,
                isLive: true
            }
        });

        if (!stream) {
            return res.status(404).json({
                error: 'Stream not found',
                message: `No active stream found with ID: ${streamId}`
            });
        }

        // Check if thumbnail exists
        const thumbnailPath = path.join(__dirname, '../../../media/thumbnails', `${streamId}_current.jpg`);
        
        if (!fs.existsSync(thumbnailPath)) {
            return res.status(404).json({
                error: 'Thumbnail not found',
                message: `No thumbnail available for stream ${streamId}`,
                thumbnailUrl: null
            });
        }

        // Get thumbnail stats for metadata
        const stats = fs.statSync(thumbnailPath);
        
        res.json({
            streamId: streamId,
            thumbnailUrl: `/thumbnails/${streamId}_current.jpg`,
            lastGenerated: stats.mtime,
            size: stats.size
        });

    } catch (error) {
        console.error(`Error fetching thumbnail for stream ${req.params.streamId}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch thumbnail information'
        });
    }
});

/**
 * GET /api/streams/stats/:username
 * Returns real-time and historical stream statistics for a specific streamer
 * Authentication: Required (Bearer JWT token)
 */
router.get('/stats/:username', authenticateToken, async (req, res) => {
    try {
        const { username } = req.params;
        
        // Find the streamer's account
        const streamer = await StreamKey.findOne({
            where: { hiveAccount: username }
        });

        if (!streamer) {
            return res.status(404).json({
                error: 'Channel not found',
                message: `No channel found for username: ${username}`
            });
        }

        // Check if user has permission to view these stats
        // (In a full implementation, you might restrict this to the channel owner or their moderators)
        // For now, any authenticated user can view stats
        
        // Get current stream info
        const isLive = streamer.isLive || false;
        const currentViewers = streamer.viewerCount || 0;
        const uptime = isLive && streamer.streamStarted ? new Date(streamer.streamStarted).getTime() : 0;

        // Get current/last session stats
        const sessionStats = await StreamStats.findOne({
            where: {
                hiveAccount: username,
                sessionEnd: { [Op.is]: null }
            },
            order: [['sessionStart', 'DESC']]
        });

        // If no active session, get the last completed session
        const lastSession = sessionStats || await StreamStats.findOne({
            where: { hiveAccount: username },
            order: [['sessionStart', 'DESC']]
        });

        const peakViewers = lastSession?.peakViewers || 0;
        const totalWatchTime = lastSession?.totalWatchTime || 0;
        const chatMessages = lastSession?.chatMessages || 0;

        // Calculate chat message rate (messages per minute)
        let chatMessageRate = 0;
        if (isLive && streamer.streamStarted) {
            const streamDurationMinutes = (Date.now() - new Date(streamer.streamStarted).getTime()) / (1000 * 60);
            if (streamDurationMinutes > 0) {
                chatMessageRate = parseFloat((chatMessages / streamDurationMinutes).toFixed(2));
            }
        }

        // Get new followers count (today or current session)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const newFollowersCount = await FollowedChannels.count({
            where: {
                followedHiveAccount: username,
                createdAt: { [Op.gte]: today }
            }
        });

        res.json({
            currentViewers,
            peakViewers,
            totalWatchTime,
            newFollowers: newFollowersCount,
            chatMessageRate,
            uptime,
            isLive
        });

    } catch (error) {
        console.error(`Error fetching stream stats for ${req.params.username}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch stream statistics'
        });
    }
});

/**
 * GET /api/streams/followers/growth/:username
 * Returns historical follower count data for analytics/charts
 * Authentication: Required (Bearer JWT token)
 * Query Parameters: days (optional, default: 7)
 */
router.get('/followers/growth/:username', authenticateToken, async (req, res) => {
    try {
        const { username } = req.params;
        const days = parseInt(req.query.days) || 7;

        // Validate days parameter
        if (days < 1 || days > 365) {
            return res.status(400).json({
                error: 'Invalid days parameter',
                message: 'Days must be between 1 and 365'
            });
        }

        // Check if the channel exists
        const channel = await StreamKey.findOne({
            where: { hiveAccount: username }
        });

        if (!channel) {
            return res.status(404).json({
                error: 'Channel not found',
                message: `No channel found for username: ${username}`
            });
        }

        // Calculate date range
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        // Fetch follower growth data
        const growthData = await FollowerGrowth.findAll({
            where: {
                hiveAccount: username,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            order: [['date', 'ASC']],
            attributes: ['date', 'followerCount']
        });

        // If no data exists, calculate current follower count and create initial data
        if (growthData.length === 0) {
            const currentFollowerCount = await FollowedChannels.count({
                where: { followedHiveAccount: username }
            });

            // Return current data point
            return res.json([{
                date: endDate.toISOString().split('T')[0],
                followers: currentFollowerCount
            }]);
        }

        // Format response
        const formattedData = growthData.map(entry => ({
            date: entry.date,
            followers: entry.followerCount
        }));

        res.json(formattedData);

    } catch (error) {
        console.error(`Error fetching follower growth for ${req.params.username}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch follower growth data'
        });
    }
});

module.exports = router;