const express = require('express');
const router = express.Router();
const hlsEncryption = require('../../server/hls-encryption');
const StreamKey = require('../../db/models/streamKey');

/**
 * POST /api/hls/token/:streamId
 * Generate an access token for viewing a stream
 */
router.post('/token/:streamId', async (req, res) => {
    try {
        const { streamId } = req.params;
        
        // Verify that the stream exists and is live
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

        // Get viewer's IP address (accounting for proxies)
        const viewerIp = req.headers['x-forwarded-for'] 
            ? req.headers['x-forwarded-for'].split(',')[0].trim()
            : req.connection.remoteAddress;

        // Generate an access token
        const token = hlsEncryption.generateAccessToken(streamId, viewerIp);

        res.json({
            success: true,
            token: token,
            expiresIn: 900 // 15 minutes in seconds
        });

    } catch (error) {
        console.error('Error generating access token:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate access token'
        });
    }
});

/**
 * GET /api/hls/key/:streamId
 * Serve the encryption key for a stream (requires valid access token)
 */
router.get('/key/:streamId', async (req, res) => {
    try {
        const { streamId } = req.params;
        const token = req.query.token;

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Access token is required'
            });
        }

        // Get viewer's IP address
        const viewerIp = req.headers['x-forwarded-for'] 
            ? req.headers['x-forwarded-for'].split(',')[0].trim()
            : req.connection.remoteAddress;

        // Validate the access token
        const isValid = hlsEncryption.validateAccessToken(token, streamId, viewerIp);

        if (!isValid) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Invalid or expired access token'
            });
        }

        // Refresh the token (extend its expiry)
        hlsEncryption.refreshAccessToken(token);

        // Get the encryption key
        const key = hlsEncryption.getStreamKey(streamId);

        if (!key) {
            return res.status(404).json({
                error: 'Key not found',
                message: `No encryption key found for stream ${streamId}`
            });
        }

        // Return the key as binary data
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', key.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(key);

    } catch (error) {
        console.error('Error serving encryption key:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to serve encryption key'
        });
    }
});

/**
 * POST /api/hls/refresh-token
 * Refresh an access token (extend its expiry)
 */
router.post('/refresh-token', (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'Token is required'
            });
        }

        const refreshed = hlsEncryption.refreshAccessToken(token);

        if (!refreshed) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Token not found or expired'
            });
        }

        res.json({
            success: true,
            message: 'Token refreshed successfully'
        });

    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to refresh token'
        });
    }
});

module.exports = router;
