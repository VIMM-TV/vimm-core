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

async function getUserByStreamKey(streamKey) {
    try {
        const user = await StreamKey.findOne({
            where: {
                streamKey: streamKey
            }
        });
        return user;
    } catch (error) {
        console.error('Error finding user by stream key:', error);
        return null;
    }
}

async function getUserByStreamId(streamId) {
    try {
        const user = await StreamKey.findOne({
            where: {
                streamID: streamId
            }
        });
        if (!user) {
            console.log(`No user found with stream ID: ${streamId}`);
            return null;
        }
        return user;
    } catch (error) {
        console.error('Error finding user by stream ID:', error);
        return null;
    }
}

async function getStreamByHiveAccount(hiveAccount) {
    try {
        const user = await StreamKey.findOne({
            where: {
                hiveAccount: hiveAccount
            }
        });
        return user;
    } catch (error) {
        console.error('Error finding user by stream key:', error);
        return null;
    }
}

async function setStreamId(hiveAccount, streamId) {
    try {
        console.log('Finding user with hiveAccount:', hiveAccount);
        const user = await StreamKey.findOne({
            where: {
                hiveAccount: hiveAccount
            }
        });
        if (!user) {
            console.error('User not found');
            return null;
        }
        //console.log('User found:', user);
        await user.update({ streamID: streamId });
        console.log('Stream ID updated successfully');
        return true;
    } catch (error) {
        console.error('Error setting stream ID:', error);
        return null;
    }
}

module.exports = {
    generateStreamKey,
    validateStreamKey,
    getUserByStreamKey,
    getUserByStreamId,
    getStreamByHiveAccount,
    setStreamId
};
