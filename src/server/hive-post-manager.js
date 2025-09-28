const { Client, PrivateKey } = require('@hiveio/dhive');
const hiveConfig = require('../../config/hive');
const config = require('../../config/default');
const ThumbnailGenerator = require('./thumbnail-generator');
const path = require('path');
const fs = require('fs');

class HivePostManager {
    constructor() {
        this.client = new Client(['https://api.hive.blog', 'https://api.hivekings.com']);
        this.activePosts = new Map();
        this.thumbnailGenerator = new ThumbnailGenerator(config.thumbnails);
        
        if (!process.env.HIVE_POSTING_KEY) {
            console.warn('WARNING: HIVE_POSTING_KEY environment variable not set');
        }
    }

    /**
     * Get the thumbnail URL for a stream
     * @param {string} streamId - The stream ID
     * @returns {string|null} - The full URL to the current thumbnail or null if not found
     */
    getThumbnailUrl(streamId) {
        try {
            const thumbnailPath = this.thumbnailGenerator.getCurrentThumbnailPath(streamId);
            if (thumbnailPath) {
                // Convert local path to URL
                const { protocol, domain } = config.watchUrl;
                const relativePath = path.relative('./media', thumbnailPath).replace(/\\/g, '/');
                return `${protocol}://${domain}/${relativePath}`;
            }
        } catch (error) {
            console.error(`Error getting thumbnail URL for stream ${streamId}:`, error);
        }
        return null;
    }

    /**
     * Generate a thumbnail for a stream if it doesn't exist
     * @param {string} streamId - The stream ID
     * @param {string} hiveAccount - The Hive account name
     * @returns {Promise<string|null>} - The thumbnail URL or null if generation failed
     */
    async ensureThumbnail(streamId, hiveAccount) {
        try {
            let thumbnailUrl = this.getThumbnailUrl(streamId);
            
            if (!thumbnailUrl) {
                console.log(`No thumbnail found for stream ${streamId}, generating one...`);
                const success = await this.thumbnailGenerator.generateThumbnail(streamId, hiveAccount);
                if (success) {
                    thumbnailUrl = this.getThumbnailUrl(streamId);
                }
            }
            
            return thumbnailUrl;
        } catch (error) {
            console.error(`Error ensuring thumbnail for stream ${streamId}:`, error);
            return null;
        }
    }

    async createStreamPost(streamId, userData, streamMetadata) {
        const {
            hiveAccount,
            streamKey,
            streamTitle,
            streamDescription,
            streamLanguage
        } = userData;

        const currentDate = new Date().toISOString();
        
        // Get or generate thumbnail
        const thumbnailUrl = await this.ensureThumbnail(streamId, hiveAccount);
        
        // Create post content
        const title = `🔴 ${streamTitle || 'Live Stream Started'}`;
        const body = this._generatePostBody({
            status: 'live',
            startTime: currentDate,
            title: streamTitle,
            description: streamDescription,
            language: streamLanguage,
            username: hiveAccount,
            streamId,
            thumbnailUrl
        });

        try {
            const safeStreamId = streamId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            const permlink = `vimm-stream-${safeStreamId}-${Date.now()}`;
            const postingKey = PrivateKey.fromString(process.env.HIVE_POSTING_KEY);

            const operations = [[
                'comment',
                {
                    parent_author: '',
                    parent_permlink: hiveConfig.defaultTags[0],
                    author: hiveAccount,
                    permlink: permlink,
                    title: title,
                    body: body,
                    json_metadata: JSON.stringify({
                        tags: hiveConfig.defaultTags,
                        app: 'vimm.tv',
                        image: thumbnailUrl ? [thumbnailUrl, 'https://vimm.tv/logo.png'] : ['https://vimm.tv/logo.png'],
                        format: 'markdown',
                        stream: {
                            id: streamId,
                            title: streamTitle,
                            language: streamLanguage,
                            startTime: currentDate,
                            thumbnail: thumbnailUrl
                        }
                    })
                }
            ]];

            // Add beneficiaries if configured
            if (hiveConfig.beneficiaries && hiveConfig.beneficiaries.length > 0) {
                operations.push([
                    'comment_options',
                    {
                        author: hiveAccount,
                        permlink: permlink,
                        max_accepted_payout: '10000.000 HBD', // set to 0.000 HBD for no payout (testing)
                        percent_hbd: 10000,
                        allow_votes: true,
                        allow_curation_rewards: true,
                        extensions: [[
                            0,
                            {
                                beneficiaries: hiveConfig.beneficiaries
                            }
                        ]]
                    }
                ]);
            }

            // Broadcast the transaction
            await this.client.broadcast.sendOperations(operations, postingKey);

            // Store post reference for future updates
            this.activePosts.set(streamId, {
                author: hiveAccount,
                permlink,
                startTime: currentDate
            });

            console.log(`Created Hive post for stream ${streamId}: @${hiveAccount}/${permlink}`);
            return { author: hiveAccount, permlink };

        } catch (error) {
            console.error('Error creating Hive post:', error);
            throw error;
        }
    }

    async updateStreamPost(streamId, status = 'offline') {
        const postRef = this.activePosts.get(streamId);
        if (!postRef) {
            console.log(`No active post found for stream ${streamId}`);
            return;
        }

        const { author, permlink, startTime } = postRef;
        const endTime = new Date().toISOString();
        
        try {
            // Get thumbnail for the stream end post
            const thumbnailUrl = this.getThumbnailUrl(streamId);
            
            const body = this._generatePostBody({
                status,
                startTime,
                endTime,
                username: author,
                streamId,
                duration: this._calculateDuration(startTime, endTime),
                thumbnailUrl
            });

            const postingKey = PrivateKey.fromString(process.env.HIVE_POSTING_KEY);

            const operations = [[
                'comment',
                {
                    parent_author: '',
                    parent_permlink: hiveConfig.defaultTags[0],
                    author: author,
                    permlink: permlink,
                    title: `Stream Ended - ${new Date(endTime).toUTCString()}`,
                    body: body,
                    json_metadata: JSON.stringify({
                        tags: hiveConfig.defaultTags,
                        app: 'vimm.tv',
                        image: thumbnailUrl ? [thumbnailUrl, 'https://vimm.tv/logo.png'] : ['https://vimm.tv/logo.png'],
                        format: 'markdown',
                        stream: {
                            id: streamId,
                            status: 'offline',
                            startTime: startTime,
                            endTime: endTime,
                            duration: this._calculateDuration(startTime, endTime),
                            thumbnail: thumbnailUrl
                        }
                    })
                }
            ]];

            // Broadcast the update
            await this.client.broadcast.sendOperations(operations, postingKey);

            if (status === 'offline') {
                this.activePosts.delete(streamId);
            }

            console.log(`Updated Hive post for stream ${streamId}: @${author}/${permlink}`);

        } catch (error) {
            console.error('Error updating Hive post:', error);
            throw error;
        }
    }

    _generatePostBody({ status, startTime, endTime, title, description, language, username, streamId, duration, thumbnailUrl }) {
        const { protocol, domain, path } = config.watchUrl;
        const watchUrl = `${protocol}://${domain}${path}?user=${username}`;
        
        let content = `# ${status === 'live' ? '🔴 Live Stream' : '⭕ Stream Ended'}\n\n`;
        
        // Add thumbnail image if available
        if (thumbnailUrl) {
            content += `![Stream Thumbnail](${thumbnailUrl})\n\n`;
        }
        
        if (status === 'live') {
            content += `### ${title || 'Live Stream'}\n\n`;
            content += `🎥 **${username}** is now streaming${description ? ': ' + description : '!'}\n\n`;
            content += `🕐 Started: ${new Date(startTime).toUTCString()}\n`;
            if (language) content += `🌐 Language: ${language}\n`;
        } else {
            content += `### Stream Summary\n\n`;
            content += `🎥 ${username}'s stream has ended\n\n`;
            content += `⏱️ Duration: ${duration}\n`;
            content += `🕐 Started: ${new Date(startTime).toUTCString()}\n`;
            content += `⏹️ Ended: ${new Date(endTime).toUTCString()}\n`;
        }

        content += `\n📺 **[Watch ${status === 'live' ? 'Now' : 'VOD'}](${watchUrl})**\n\n`;
        content += `\n---\n*Posted via vimm-core*`;

        return content;
    }

    _calculateDuration(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const durationMs = end - start;
        
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m`;
    }
}

module.exports = HivePostManager;