const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const mediaServer = require('./nms-instance');
const streamsRoutes = require('../api/routes/streams');
const Logger = require('node-media-server/src/node_core_logger');
const { validateStreamKey, getUserByStreamKey, setStreamId } = require('../auth/streamkey');
const { execSync } = require('child_process');
const HivePostManager = require('./hive-post-manager');
const hivePostManager = new HivePostManager();
const CustomTranscoder = require('./custom-transcoder');
const transcoder = new CustomTranscoder();

// Create Express application
const app = express();
const port = process.env.PORT || 3000;

async function startServer() {
    try {
        // Initialize media server first
        const nms = await mediaServer.initialize();
        
        // Basic middleware setup
        app.use(cors());
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(morgan('dev'));

        // Serve static files (like thumbnails)
        app.use('/thumbnails', express.static(path.join(__dirname, '../../media/thumbnails')));
        app.use('/media', express.static(path.join(__dirname, '../../media')));

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // Set up Node-Media-Server event handlers
        nms.on('preConnect', (id, args) => {
            Logger.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
        });

        nms.on('postConnect', (id, args) => {
            Logger.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
        });

        nms.on('prePublish', async (id, StreamPath, args) => {
            Logger.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
            
            // Extract stream key from StreamPath
            const streamKey = StreamPath.split('/')[2];
            const session = nms.getSession(id);
            
            if (!streamKey) {
                console.error('[Authentication Failed] No stream key provided');
                session.reject();
                return;
            }
            
            const newStreamPath = `/live/${id}`;
            session.publishStreamPath = newStreamPath;
            if (session.pushStream) {
                session.pushStream.streamPath = newStreamPath;
            }

            try {
                const isValid = await validateStreamKey(streamKey);
                if (!isValid) {
                    Logger.log('[Authentication Failed]', `Invalid stream key: ${streamKey}`);
                    session.sendStatusMessage(id, 'error', 'NetStream.Publish.Unauthorized', 'Invalid stream key');
                    session.reject();
                } else {
                    Logger.log('[Authentication Success]', `Valid stream key: ${streamKey}`);
                    const user = await getUserByStreamKey(streamKey);
                    if (user) {
                        await setStreamId(user.hiveAccount, id);
                        Logger.log(`[Stream ID Set] Stream ID ${id} set for Hive account ${user.hiveAccount}`);
                        
                        try {
                            console.log(`Creating Hive post for user: ${user.hiveAccount} with stream ID: ${id}`);
                            await hivePostManager.createStreamPost(id, {
                                hiveAccount: user.hiveAccount,
                                streamKey: user.streamKey,
                                streamTitle: user.streamTitle || 'Live Stream',
                                streamDescription: user.streamDescription || '',
                                streamLanguage: user.streamLanguage || 'EN_US'
                            });
                        } catch (error) {
                            console.error('Failed to create Hive post:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('[Authentication Error]', error);
                session.reject();
            }
        });

        nms.on('postPublish', async (id, StreamPath, args) => {
            Logger.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath}`);
            const inputUrl = `rtmp://localhost:1935${StreamPath}`;
            transcoder.startTranscoding(id, inputUrl);
        });

        nms.on('donePublish', async (id, StreamPath, args) => {
            Logger.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath}`);
            transcoder.stopTranscoding(id);
            try {
                execSync(`rm -rf ./media/live/${id}`);
                await hivePostManager.updateStreamPost(id, 'offline');
            } catch (error) {
                console.error('Error in donePublish cleanup:', error);
            }
        });

        nms.on('prePlay', (id, StreamPath, args) => {
            Logger.log('[NodeEvent on prePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
        });

        nms.on('postPlay', (id, StreamPath, args) => {
            Logger.log('[NodeEvent on postPlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
        });

        nms.on('donePlay', (id, StreamPath, args) => {
            Logger.log('[NodeEvent on donePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
        });

        // Monitor transcoding events
        nms.on('postTranscode', (id, StreamPath, args) => {
            Logger.log('[Transcode]', `Stream ${StreamPath} transcoding started`);
        });

        nms.on('doneTranscode', (id, StreamPath, args) => {
            Logger.log('[Transcode]', `Stream ${StreamPath} transcoding finished`);
            try {
                execSync(`rm -rf ./media/live/${id}`);
            } catch (error) {
                console.error('Error cleaning up transcoded files:', error);
            }
        });

        // API Routes
        app.use('/api/streams', streamsRoutes);

        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
            });
        });

        // Start Express server
        app.listen(port, () => {
            Logger.log(`Express server running on port ${port}`);
            Logger.log('Media server running on RTMP port 1935 and HTTP port 8000');
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Perform any necessary cleanup
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Perform any necessary cleanup
    process.exit(1);
});

// Start the server
startServer();

module.exports = app;