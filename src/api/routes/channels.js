const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const FollowedChannels = require('../../db/models/followedChannels');
const StreamKey = require('../../db/models/streamKey');
const { Op } = require('sequelize');

/**
 * POST /api/channels/follow
 * Follow a channel (authenticated)
 */
router.post('/follow', authenticateToken, async (req, res) => {
    try {
        const { channelUsername } = req.body;
        const followerUsername = req.user.hiveAccount;
        
        if (!channelUsername) {
            return res.status(400).json({ 
                error: 'Missing required field',
                message: 'channelUsername is required' 
            });
        }

        // Prevent self-following
        if (followerUsername === channelUsername) {
            return res.status(400).json({ 
                error: 'Invalid operation',
                message: 'Cannot follow yourself' 
            });
        }

        // Check if the channel exists
        const channelExists = await StreamKey.findOne({
            where: { hiveAccount: channelUsername }
        });
        
        if (!channelExists) {
            return res.status(404).json({ 
                error: 'Channel not found',
                message: `Channel @${channelUsername} not found` 
            });
        }

        // Check if already following
        const existingFollow = await FollowedChannels.findOne({
            where: {
                followerHiveAccount: followerUsername,
                followedHiveAccount: channelUsername
            }
        });

        if (existingFollow) {
            return res.status(409).json({ 
                error: 'Already following',
                message: `You are already following @${channelUsername}` 
            });
        }

        // Create the follow relationship
        const follow = await FollowedChannels.create({
            followerHiveAccount: followerUsername,
            followedHiveAccount: channelUsername
        });

        res.status(201).json({ 
            success: true,
            message: `Successfully followed @${channelUsername}`,
            follow: {
                id: follow.id,
                follower: followerUsername,
                followed: channelUsername,
                createdAt: follow.createdAt
            }
        });

    } catch (error) {
        console.error('Error following channel:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to follow channel' 
        });
    }
});

/**
 * DELETE /api/channels/unfollow  
 * Unfollow a channel (authenticated)
 */
router.delete('/unfollow', authenticateToken, async (req, res) => {
    try {
        const { channelUsername } = req.body;
        const followerUsername = req.user.hiveAccount;
        
        if (!channelUsername) {
            return res.status(400).json({ 
                error: 'Missing required field',
                message: 'channelUsername is required' 
            });
        }

        // Find and remove the follow relationship
        const deletedCount = await FollowedChannels.destroy({
            where: {
                followerHiveAccount: followerUsername,
                followedHiveAccount: channelUsername
            }
        });

        if (deletedCount === 0) {
            return res.status(404).json({ 
                error: 'Not following',
                message: `You are not following @${channelUsername}` 
            });
        }

        res.json({ 
            success: true,
            message: `Successfully unfollowed @${channelUsername}`
        });

    } catch (error) {
        console.error('Error unfollowing channel:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to unfollow channel' 
        });
    }
});

/**
 * GET /api/channels/my-channel
 * Get authenticated user's channel settings
 */
router.get('/my-channel', authenticateToken, async (req, res) => {
    try {
        const username = req.user.hiveAccount;
        
        // Find the user's stream key/channel
        const channel = await StreamKey.findOne({
            where: { hiveAccount: username }
        });

        if (!channel) {
            return res.status(404).json({ 
                error: 'Channel not found',
                message: `No channel found for user @${username}. Please generate a stream key first.` 
            });
        }

        // Return channel settings
        res.json({
            username: channel.hiveAccount,
            title: channel.streamTitle || '',
            description: channel.streamDescription || '',
            language: channel.streamLanguage || '',
            category: channel.streamCategory || '',
            isLive: channel.isLive,
            streamId: channel.streamID,
            viewerCount: channel.viewerCount || 0,
            streamStarted: channel.streamStarted,
            lastUsed: channel.lastUsed
        });

    } catch (error) {
        console.error('Error fetching user channel:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to fetch channel settings' 
        });
    }
});

/**
 * PUT /api/channels/my-channel
 * Update authenticated user's channel settings
 */
router.put('/my-channel', authenticateToken, async (req, res) => {
    try {
        const username = req.user.hiveAccount;
        const { title, description, language, category } = req.body;
        
        // Find the user's stream key/channel
        const channel = await StreamKey.findOne({
            where: { hiveAccount: username }
        });

        if (!channel) {
            return res.status(404).json({ 
                error: 'Channel not found',
                message: `No channel found for user @${username}. Please generate a stream key first.` 
            });
        }

        // Validate input data
        const updateData = {};
        
        if (title !== undefined) {
            if (typeof title !== 'string' || title.length > 255) {
                return res.status(400).json({ 
                    error: 'Invalid title',
                    message: 'Title must be a string with maximum 255 characters' 
                });
            }
            updateData.streamTitle = title.trim();
        }

        if (description !== undefined) {
            if (typeof description !== 'string') {
                return res.status(400).json({ 
                    error: 'Invalid description',
                    message: 'Description must be a string' 
                });
            }
            updateData.streamDescription = description.trim();
        }

        if (language !== undefined) {
            if (typeof language !== 'string' || language.length > 10) {
                return res.status(400).json({ 
                    error: 'Invalid language',
                    message: 'Language must be a string with maximum 10 characters' 
                });
            }
            updateData.streamLanguage = language.trim();
        }

        if (category !== undefined) {
            if (typeof category !== 'string') {
                return res.status(400).json({ 
                    error: 'Invalid category',
                    message: 'Category must be a string' 
                });
            }
            updateData.streamCategory = category.trim();
        }

        // Update the channel
        await channel.update(updateData);
        await channel.reload();

        res.json({
            success: true,
            message: 'Channel settings updated successfully',
            channel: {
                username: channel.hiveAccount,
                title: channel.streamTitle || '',
                description: channel.streamDescription || '',
                language: channel.streamLanguage || '',
                category: channel.streamCategory || '',
                isLive: channel.isLive,
                streamId: channel.streamID,
                viewerCount: channel.viewerCount || 0,
                streamStarted: channel.streamStarted,
                lastUsed: channel.lastUsed
            }
        });

    } catch (error) {
        console.error('Error updating channel settings:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to update channel settings' 
        });
    }
});

module.exports = router;