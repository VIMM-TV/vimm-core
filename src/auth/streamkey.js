const crypto = require('crypto');
const StreamKey = require('../db/models/streamKey');

async function generateStreamKey(hiveAccount) {
    // Generate a random stream key
    const streamKey = crypto.randomBytes(32).toString('hex');

    // Save to database
    await StreamKey.create({
        hiveAccount,
        streamKey,
        isActive: true
    });

    return streamKey;
}

async function validateStreamKey(streamKey) {
    const keyRecord = await StreamKey.findOne({ 
        where: { 
            streamKey, 
            isActive: true 
        } 
    });
    
    if (keyRecord) {
        // Update last used timestamp
        await keyRecord.update({ lastUsed: new Date() });
        return true;
    }
    
    return false;
}

module.exports = {
    generateStreamKey,
    validateStreamKey
};
