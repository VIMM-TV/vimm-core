const express = require('express');
const router = express.Router();
const ChatConfig = require('../../db/models/chatConfig');
const StreamKey = require('../../db/models/streamKey');
const BannedUsers = require('../../db/models/bannedUsers');
const { authenticateToken } = require('../../middleware/auth');

/**
 * GET /api/chat/stream/:hiveAccount
 * Returns chat settings for a specific stream
 */
router.get('/stream/:hiveAccount', async (req, res) => {
    try {
        const { hiveAccount } = req.params;
        
        const chatConfig = await ChatConfig.findOne({
            where: { hiveAccount: hiveAccount }
        });

        if (!chatConfig) {
            // If no config exists yet, return default values
            return res.status(404).json({
                error: 'Chat configuration not found',
                message: `No chat configuration for stream ID: ${hiveAccount}`
            });
        }

        res.json(chatConfig);

    } catch (error) {
        console.error(`Error fetching chat settings for stream ${req.params.hiveAccount}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch chat settings'
        });
    }
});

/**
 * POST /api/chat/stream/:hiveAccount
 * Create or update chat configuration for a stream
 */
router.post('/stream/:hiveAccount', async (req, res) => {
    try {
        const { hiveAccount } = req.params;
        
        // First verify the stream exists
        const stream = await StreamKey.findOne({
            where: { hiveAccount: hiveAccount }
        });

        if (!stream) {
            return res.status(404).json({
                error: 'Stream not found',
                message: `No stream found with ID: ${hiveAccount}`
            });
        }

        // Find or create chat config
        let [chatConfig, created] = await ChatConfig.findOrCreate({
            where: { hiveAccount: hiveAccount },
            defaults: {
                ...req.body,
                hiveAccount: hiveAccount
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
        console.error(`Error updating chat config for stream ${req.params.hiveAccount}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to update chat configuration'
        });
    }
});

/**
 * GET /api/chat/banned/:username
 * Returns list of users banned from a specific channel's chat
 * Authentication: Required (Bearer JWT token)
 * Authorization: Only channel owner or moderators can access
 */
router.get('/banned/:username', authenticateToken, async (req, res) => {
    try {
        const { username } = req.params;
        const requestingUser = req.user.hiveAccount;

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

        // Get chat config to check moderators list
        const chatConfig = await ChatConfig.findOne({
            where: { hiveAccount: username }
        });

        // Check authorization: must be channel owner or a moderator
        const isChannelOwner = requestingUser === username;
        const isModerator = chatConfig?.moderators?.includes(requestingUser) || false;

        if (!isChannelOwner && !isModerator) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to access this channel\'s banned users list'
            });
        }

        // Fetch banned users for this channel
        const bannedUsers = await BannedUsers.findAll({
            where: {
                channelHiveAccount: username,
                isActive: true
            },
            order: [['bannedAt', 'DESC']],
            attributes: ['bannedUsername', 'bannedAt', 'bannedBy', 'reason']
        });

        // Format response
        const formattedBannedUsers = bannedUsers.map(ban => ({
            username: ban.bannedUsername,
            bannedAt: ban.bannedAt,
            bannedBy: ban.bannedBy,
            reason: ban.reason || ''
        }));

        res.json(formattedBannedUsers);

    } catch (error) {
        console.error(`Error fetching banned users for ${req.params.username}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch banned users list'
        });
    }
});

module.exports = router;