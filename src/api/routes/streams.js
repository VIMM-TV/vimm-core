const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const StreamKey = require('../../db/models/streamKey');

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
            thumbnail: `/thumbnails/${stream.streamID}.jpg`,
            isLive: stream.isLive,
            streamPath: `/live/${stream.streamID}`
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
            thumbnail: `/thumbnails/${stream.streamID}.jpg`,
            isLive: stream.isLive,
            streamPath: `/live/${stream.streamID}`
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

module.exports = router;