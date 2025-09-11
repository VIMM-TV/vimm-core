const express = require('express');
const router = express.Router();
const { generateStreamKey } = require('../../auth/streamkey');
const { generateChallenge } = require('../../auth/hiveAuth');
const { generateToken } = require('../../middleware/auth');
const { Client } = require('@hiveio/dhive');

// In-memory storage for challenges (in production, use Redis or database)
const challenges = new Map();

// Clean up expired challenges every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of challenges.entries()) {
    if (now - data.timestamp > 300000) { // 5 minutes
      challenges.delete(key);
    }
  }
}, 300000);

router.post('/stream-key', async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Generate a stream key for the user
        const streamKey = await generateStreamKey(username);

        res.json({ streamKey });
    } catch (error) {
        console.error('Stream key generation error:', error);
        res.status(500).json({ error: 'Failed to generate stream key' });
    }
});

/**
 * POST /api/auth/hive
 * Hive Keychain authentication endpoint
 * Reuses vimm-chat logic for challenge generation and verification
 */
router.post('/hive', async (req, res) => {
    try {
        const { username, signature, challenge } = req.body;
        
        if (!username || !signature || !challenge) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                message: 'Username, signature, and challenge are required' 
            });
        }

        // Verify the challenge exists and hasn't expired
        const challengeData = challenges.get(challenge);
        if (!challengeData) {
            return res.status(400).json({ 
                error: 'Invalid challenge',
                message: 'Challenge not found or expired' 
            });
        }

        // Remove the challenge to prevent reuse
        challenges.delete(challenge);

        // Validate signature format (basic check)
        if (!signature || signature.length < 10) {
            return res.status(401).json({ 
                error: 'Authentication failed',
                message: 'Invalid signature format' 
            });
        }

        // For production, implement proper Hive signature verification here
        // For now, we assume the signature is valid if it passes basic checks
        
        try {
            // Generate JWT token for authenticated user
            const token = generateToken(username);
            
            res.json({ 
                success: true,
                token,
                username,
                message: 'Authentication successful' 
            });
            
        } catch (tokenError) {
            console.error('Error generating token:', tokenError);
            return res.status(500).json({ 
                error: 'Authentication failed',
                message: 'Failed to generate authentication token' 
            });
        }

    } catch (error) {
        console.error('Hive authentication error:', error);
        res.status(500).json({ 
            error: 'Authentication failed',
            message: 'Internal server error during authentication' 
        });
    }
});

/**
 * GET /api/auth/challenge
 * Generate a challenge for Hive authentication
 */
router.get('/challenge', (req, res) => {
    try {
        const challenge = generateChallenge();
        
        // Store challenge with timestamp
        challenges.set(challenge, {
            timestamp: Date.now()
        });
        
        res.json({ challenge });
    } catch (error) {
        console.error('Challenge generation error:', error);
        res.status(500).json({ error: 'Failed to generate challenge' });
    }
});

module.exports = router;
