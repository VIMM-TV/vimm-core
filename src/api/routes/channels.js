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

module.exports = router;