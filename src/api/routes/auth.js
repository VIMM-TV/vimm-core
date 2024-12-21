const express = require('express');
const router = express.Router();
const { generateStreamKey } = require('../../auth/streamkey');

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

module.exports = router;
