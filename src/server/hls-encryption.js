const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * HLS Encryption Manager
 * Manages encryption keys and access tokens for HLS streams
 */
class HLSEncryption {
    constructor() {
        // Store active encryption keys for each stream
        this.streamKeys = new Map();
        // Store access tokens (short-lived, per-viewer tokens)
        this.accessTokens = new Map();
        // Token expiry time (15 minutes)
        this.tokenExpiryMs = 15 * 60 * 1000;
    }

    /**
     * Generate a new AES-128 encryption key for a stream
     * @param {string} streamId - The unique stream identifier
     * @returns {Buffer} - The 16-byte encryption key
     */
    generateStreamKey(streamId) {
        // Generate a random 128-bit (16-byte) key for AES-128
        const key = crypto.randomBytes(16);
        
        // Store the key in memory
        this.streamKeys.set(streamId, {
            key: key,
            createdAt: Date.now()
        });

        console.log(`[HLS Encryption] Generated encryption key for stream ${streamId}`);
        return key;
    }

    /**
     * Get the encryption key for a stream
     * @param {string} streamId - The unique stream identifier
     * @returns {Buffer|null} - The encryption key or null if not found
     */
    getStreamKey(streamId) {
        const keyData = this.streamKeys.get(streamId);
        return keyData ? keyData.key : null;
    }

    /**
     * Save the encryption key to a file (used by FFmpeg)
     * @param {string} streamId - The unique stream identifier
     * @param {string} streamDir - The directory where the stream files are stored
     * @returns {string} - The path to the key file
     */
    saveKeyToFile(streamId, streamDir) {
        const key = this.getStreamKey(streamId);
        if (!key) {
            throw new Error(`No encryption key found for stream ${streamId}`);
        }

        // Ensure the directory exists
        if (!fs.existsSync(streamDir)) {
            fs.mkdirSync(streamDir, { recursive: true });
        }

        // Write the key to a file
        const keyFilePath = path.join(streamDir, 'enc.key');
        fs.writeFileSync(keyFilePath, key);
        
        console.log(`[HLS Encryption] Saved encryption key to ${keyFilePath}`);
        return keyFilePath;
    }

    /**
     * Generate an access token for a viewer
     * @param {string} streamId - The unique stream identifier
     * @param {string} viewerIp - The IP address of the viewer (optional, for additional security)
     * @returns {string} - The access token
     */
    generateAccessToken(streamId, viewerIp = null) {
        // Generate a random token
        const token = crypto.randomBytes(32).toString('hex');
        
        // Store the token with metadata
        this.accessTokens.set(token, {
            streamId: streamId,
            viewerIp: viewerIp,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.tokenExpiryMs
        });

        console.log(`[HLS Encryption] Generated access token for stream ${streamId}`);
        return token;
    }

    /**
     * Validate an access token
     * @param {string} token - The access token to validate
     * @param {string} streamId - The stream ID being accessed
     * @param {string} viewerIp - The IP address of the viewer (optional)
     * @returns {boolean} - True if the token is valid
     */
    validateAccessToken(token, streamId, viewerIp = null) {
        const tokenData = this.accessTokens.get(token);
        
        if (!tokenData) {
            console.log(`[HLS Encryption] Token not found: ${token}`);
            return false;
        }

        // Check if token has expired
        if (Date.now() > tokenData.expiresAt) {
            console.log(`[HLS Encryption] Token expired: ${token}`);
            this.accessTokens.delete(token);
            return false;
        }

        // Check if token is for the correct stream
        if (tokenData.streamId !== streamId) {
            console.log(`[HLS Encryption] Token stream mismatch: ${token}`);
            return false;
        }

        // Optional: Check if IP matches (can be disabled if behind proxy)
        // if (viewerIp && tokenData.viewerIp && tokenData.viewerIp !== viewerIp) {
        //     console.log(`[HLS Encryption] Token IP mismatch: ${token}`);
        //     return false;
        // }

        return true;
    }

    /**
     * Refresh an access token (extend its expiry)
     * @param {string} token - The access token to refresh
     * @returns {boolean} - True if the token was refreshed
     */
    refreshAccessToken(token) {
        const tokenData = this.accessTokens.get(token);
        
        if (!tokenData) {
            return false;
        }

        // Extend the expiry time
        tokenData.expiresAt = Date.now() + this.tokenExpiryMs;
        this.accessTokens.set(token, tokenData);
        
        console.log(`[HLS Encryption] Refreshed token: ${token}`);
        return true;
    }

    /**
     * Clean up resources for a stream (called when stream ends)
     * @param {string} streamId - The unique stream identifier
     */
    cleanupStream(streamId) {
        // Remove the stream key
        this.streamKeys.delete(streamId);
        
        // Remove all access tokens for this stream
        for (const [token, tokenData] of this.accessTokens.entries()) {
            if (tokenData.streamId === streamId) {
                this.accessTokens.delete(token);
            }
        }

        // Delete the key file
        try {
            const keyFilePath = path.join('./media/live', streamId, 'enc.key');
            if (fs.existsSync(keyFilePath)) {
                fs.unlinkSync(keyFilePath);
                console.log(`[HLS Encryption] Deleted key file for stream ${streamId}`);
            }
        } catch (error) {
            console.error(`[HLS Encryption] Error deleting key file:`, error);
        }

        console.log(`[HLS Encryption] Cleaned up resources for stream ${streamId}`);
    }

    /**
     * Clean up expired tokens (should be called periodically)
     */
    cleanupExpiredTokens() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [token, tokenData] of this.accessTokens.entries()) {
            if (now > tokenData.expiresAt) {
                this.accessTokens.delete(token);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`[HLS Encryption] Cleaned up ${cleanedCount} expired tokens`);
        }
    }
}

// Export a singleton instance
module.exports = new HLSEncryption();
