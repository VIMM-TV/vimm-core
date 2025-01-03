const { Client, PrivateKey } = require('@hiveio/dhive');
const hiveConfig = require('../../config/hive');

class HivePostManager {
    constructor() {
        this.client = new Client(['https://api.hive.blog', 'https://api.hivekings.com']);
        this.activePosts = new Map();
        
        if (!process.env.HIVE_POSTING_KEY) {
            console.warn('WARNING: HIVE_POSTING_KEY environment variable not set');
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
        
        // Create post content
        const title = `🔴 ${streamTitle || 'Live Stream Started'}`;
        const body = this._generatePostBody({
            status: 'live',
            startTime: currentDate,
            title: streamTitle,
            description: streamDescription,
            language: streamLanguage,
            username: hiveAccount,
            streamId
        });

        try {
            const permlink = `vimm-stream-${streamId}-${Date.now()}`;
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
                        image: ['https://vimm.tv/logo.png'],  // Add your logo URL here
                        format: 'markdown',
                        stream: {
                            id: streamId,
                            title: streamTitle,
                            language: streamLanguage,
                            startTime: currentDate
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
                        max_accepted_payout: '1000000.000 HBD',
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
            const body = this._generatePostBody({
                status,
                startTime,
                endTime,
                username: author,
                streamId,
                duration: this._calculateDuration(startTime, endTime)
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
                        image: ['https://vimm.tv/logo.png'],
                        format: 'markdown',
                        stream: {
                            id: streamId,
                            status: 'offline',
                            startTime: startTime,
                            endTime: endTime,
                            duration: this._calculateDuration(startTime, endTime)
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

    _generatePostBody({ status, startTime, endTime, title, description, language, username, streamId, duration }) {
        const watchUrl = `http://${process.env.SERVER_IP || 'localhost'}:3000/player.html?user=${username}`;
        
        let content = `# ${status === 'live' ? '🔴 Live Stream' : '⭕ Stream Ended'}\n\n`;
        
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