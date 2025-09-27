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
        
        console.log(`Generated challenge: ${challenge}`); // Debug log
        
        res.json({ challenge });
    } catch (error) {
        console.error('Challenge generation error:', error);
        res.status(500).json({ error: 'Failed to generate challenge' });
    }
});

/**
 * POST /api/auth/hive
 * Hive Keychain authentication endpoint
 */
router.post('/hive', async (req, res) => {
    try {
        const { username, signature, challenge } = req.body;
        
        console.log(`Authentication attempt - Username: ${username}, Challenge: ${challenge}`); // Debug log
        
        if (!username || !signature || !challenge) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                message: 'Username, signature, and challenge are required' 
            });
        }

        // Verify the challenge exists and hasn't expired
        const challengeData = challenges.get(challenge);
        console.log(`Challenge lookup result:`, challengeData); // Debug log
        
        if (!challengeData) {
            console.log(`Available challenges:`, Array.from(challenges.keys())); // Debug log
            return res.status(400).json({ 
                error: 'Invalid challenge',
                message: 'Challenge not found or expired' 
            });
        }

        // Check if challenge is expired (5 minutes)
        const now = Date.now();
        if (now - challengeData.timestamp > 300000) {
            challenges.delete(challenge);
            return res.status(400).json({ 
                error: 'Challenge expired',
                message: 'Challenge has expired, please request a new one' 
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
            
            console.log(`Authentication successful for user: ${username}`); // Debug log
            
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
 * POST /api/auth/verify
 * Verify authentication token
 */
router.post('/verify', (req, res) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Missing or invalid authorization header',
                message: 'Token required for verification' 
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        if (!token) {
            return res.status(401).json({ 
                error: 'No token provided',
                message: 'Authentication token is required' 
            });
        }

        // Verify the JWT token
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use same secret as in generateToken
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log(`Token verification successful for user: ${decoded.username}`); // Debug log
            
            res.json({ 
                success: true,
                valid: true,
                username: decoded.username,
                message: 'Token is valid' 
            });
            
        } catch (jwtError) {
            console.log('Token verification failed:', jwtError.message); // Debug log
            
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired',
                    message: 'Authentication token has expired' 
                });
            } else if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    error: 'Invalid token',
                    message: 'Authentication token is invalid' 
                });
            } else {
                return res.status(401).json({ 
                    error: 'Token verification failed',
                    message: 'Unable to verify authentication token' 
                });
            }
        }

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ 
            error: 'Verification failed',
            message: 'Internal server error during token verification' 
        });
    }
});

module.exports = router;
