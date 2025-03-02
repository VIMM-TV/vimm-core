const express = require('express');
const router = express.Router();
const ChatConfig = require('../../db/models/chatConfig');
const StreamKey = require('../../db/models/streamKey');

/**
 * GET /api/chat/stream/:streamId
 * Returns chat settings for a specific stream
 */
router.get('/stream/:streamId', async (req, res) => {
    try {
        const { streamId } = req.params;
        
        const chatConfig = await ChatConfig.findOne({
            where: { streamID: streamId }
        });

        if (!chatConfig) {
            // If no config exists yet, return default values
            return res.status(404).json({
                error: 'Chat configuration not found',
                message: `No chat configuration for stream ID: ${streamId}`
            });
        }

        res.json(chatConfig);

    } catch (error) {
        console.error(`Error fetching chat settings for stream ${req.params.streamId}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch chat settings'
        });
    }
});

/**
 * POST /api/chat/stream/:streamId
 * Create or update chat configuration for a stream
 */
router.post('/stream/:streamId', async (req, res) => {
    try {
        const { streamId } = req.params;
        
        // First verify the stream exists
        const stream = await StreamKey.findOne({
            where: { streamID: streamId }
        });

        if (!stream) {
            return res.status(404).json({
                error: 'Stream not found',
                message: `No stream found with ID: ${streamId}`
            });
        }

        // Find or create chat config
        let [chatConfig, created] = await ChatConfig.findOrCreate({
            where: { streamID: streamId },
            defaults: {
                ...req.body,
                streamID: streamId
            }
        });

        // If config already existed, update it
        if (!created) {
            await chatConfig.update(req.body);
            await chatConfig.reload();
        }

        res.status(created ? 201 : 200).json({
            message: created ? 'Chat configuration created' : 'Chat configuration updated',
            config: chatConfig
        });

    } catch (error) {
        console.error(`Error updating chat config for stream ${req.params.streamId}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to update chat configuration'
        });
    }
});

module.exports = router;