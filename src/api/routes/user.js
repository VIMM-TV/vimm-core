const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const FollowedChannels = require('../../db/models/followedChannels');
const StreamKey = require('../../db/models/streamKey');

/**
 * GET /api/user/followed-channels
 * Get user's followed channels (authenticated)
 */
router.get('/followed-channels', authenticateToken, async (req, res) => {
    try {
        const username = req.user.hiveAccount;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
        
        // Get followed channels with channel details
        const { count, rows } = await FollowedChannels.findAndCountAll({
            where: { followerHiveAccount: username },
            include: [{
                model: StreamKey,
                as: 'followed',
                attributes: ['hiveAccount', 'streamTitle', 'streamDescription', 'streamLanguage', 'streamCategory', 'isLive', 'streamID']
            }],
            limit: limit,
            offset: (page - 1) * limit,
            order: [['createdAt', 'DESC']]
        });

        // Transform the data for response
        const followedChannels = rows.map(follow => ({
            followId: follow.id,
            followedAt: follow.createdAt,
            channel: {
                username: follow.followed.hiveAccount,
                title: follow.followed.streamTitle || 'Untitled Stream',
                description: follow.followed.streamDescription || '',
                language: follow.followed.streamLanguage,
                category: follow.followed.streamCategory,
                isLive: follow.followed.isLive,
                streamId: follow.followed.streamID,
                thumbnail: follow.followed.streamID ? `/thumbnails/${follow.followed.streamID}.jpg` : null,
                streamPath: follow.followed.streamID ? `/live/${follow.followed.streamID}` : null
            }
        }));

        res.json({
            followedChannels,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalFollowed: count,
                limit: limit
            }
        });

    } catch (error) {
        console.error('Error fetching followed channels:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to fetch followed channels' 
        });
    }
});

module.exports = router;