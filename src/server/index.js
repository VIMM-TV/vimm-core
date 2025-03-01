const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const mediaServer = require('./nms-instance');
const streamsRoutes = require('../api/routes/streams');
const Logger = require('node-media-server/src/node_core_logger');
const { validateStreamKey, getUserByStreamKey, getUserByStreamId, getStreamByHiveAccount, setStreamId } = require('../auth/streamkey');
const StreamKey = require('../db/models/streamKey');
const { Op } = require('sequelize');
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
        app.use(express.static(path.join(__dirname, '../web/public')));
        app.use(express.urlencoded({ extended: true }));
        app.use(morgan('dev'));

        // Serve static files (like thumbnails)
        app.use('/thumbnails', express.static(path.join(__dirname, '../../media/thumbnails')));
        app.use('/live', express.static(path.join(__dirname, '../../media/live')));

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
                        // Update the database record with stream info
                        await user.update({
                            streamID: id,
                            isLive: true,
                            streamStarted: new Date(),
                            lastUsed: new Date(),
                            viewerCount: 0
                        });
                        
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
                // Find the user by stream ID and update the record
                const user = await getUserByStreamId(id);
                if (user) {
                    try {
                        await user.update({
                            isLive: false,
                            viewerCount: 0
                        });
                        Logger.log(`[Stream Status] Stream ${id} marked as offline`);
                    } catch (updateError) {
                        console.error('Failed to update stream status:', updateError);
                        // Retry the update
                        try {
                            await user.reload();
                            await user.update({ isLive: false });
                            Logger.log(`[Stream Status] Stream ${id} marked as offline after retry`);
                        } catch (retryError) {
                            console.error('Retry to update stream status failed:', retryError);
                        }
                    }
                } else {
                    console.error(`No user found with stream ID: ${id}, cannot update status`);
                }
                
                execSync(`rm -rf ./media/live/${id}`);
                await hivePostManager.updateStreamPost(id, 'offline');
            } catch (error) {
                console.error('Error in donePublish cleanup:', error);
            }
        });

        nms.on('doneConnect', async (id, args) => {
            Logger.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
            
            try {
                // Check for any streams that were associated with this connection
                const user = await getUserByStreamId(id);
                if (user && user.isLive) {
                    await user.update({
                        isLive: false,
                        viewerCount: 0
                    });
                    Logger.log(`[Stream Status] Stream ${id} marked as offline due to disconnection`);
                    
                    // Clean up files and update Hive post
                    execSync(`rm -rf ./media/live/${id}`);
                    await hivePostManager.updateStreamPost(id, 'offline');
                }
            } catch (error) {
                console.error('Error handling disconnect cleanup:', error);
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
        setupStreamCleanupJob();

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

function setupStreamCleanupJob() {
    console.log('Setting up stream cleanup job to run every 30 seconds');
    setInterval(async () => {
        try {
            // Find all streams that are marked as live
            const activeStreams = await StreamKey.findAll({
                where: {
                    isLive: true
                }
            });
            
            console.log(`Found ${activeStreams.length} streams marked as live in the database`);
            
            for (const stream of activeStreams) {
                const id = stream.streamID;
                if (!id) {
                    console.log(`Stream record has no streamID, skipping: ${JSON.stringify(stream.toJSON())}`);
                    continue;
                }
                
                console.log(`Checking activity for stream ${id} (${stream.hiveAccount})`);
                
                // Check if HLS files exist and are being updated
                const [isStreamActive, reason] = await checkHLSActivity(id);
                
                console.log(`Stream ${id} active: ${isStreamActive}${!isStreamActive ? ` (Reason: ${reason})` : ''}`);
                
                if (!isStreamActive) {
                    console.log(`Stream ${id} appears to be inactive based on HLS files. Marking as offline.`);
                    
                    // Update the database
                    try {
                        await stream.update({ 
                            isLive: false, 
                            viewerCount: 0 
                        });
                        console.log(`Database updated for stream ${id}: isLive=false`);
                    } catch (dbError) {
                        console.error(`Failed to update database for stream ${id}:`, dbError);
                    }
                    
                    // Update Hive post
                    try {
                        await hivePostManager.updateStreamPost(id, 'offline');
                        console.log(`Updated Hive post for stream ${id}`);
                    } catch (e) {
                        console.error(`Failed to update Hive post for ${id}:`, e);
                    }
                    
                    // Stop any transcoding processes that might still be running
                    try {
                        transcoder.stopTranscoding(id);
                        console.log(`Stopped transcoding for stream ${id}`);
                    } catch (e) {
                        console.error(`Failed to stop transcoding for ${id}:`, e);
                    }
                    
                    // Clean up media files
                    try {
                        const mediaPath = `./media/live/${id}`;
                        console.log(`Removing media files at ${mediaPath}`);
                        execSync(`rm -rf ${mediaPath}`);
                        console.log(`Media files removed for stream ${id}`);
                    } catch (e) {
                        console.error(`Failed to clean up media files for ${id}:`, e);
                    }
                }
            }
        } catch (error) {
            console.error('Error in stream cleanup job:', error);
        }
    }, 30 * 1000); // Run every 30 seconds
}

async function checkHLSActivity(streamId) {
    return new Promise((resolve) => {
        try {
            const streamDir = path.join('./media/live', streamId);
            console.log(`Checking stream directory: ${streamDir}`);
            
            // Check if the stream directory exists
            if (!fs.existsSync(streamDir)) {
                console.log(`Stream directory does not exist: ${streamDir}`);
                return resolve([false, 'directory_not_found']);
            }
            
            // Check if the master playlist exists
            const masterPlaylistPath = path.join(streamDir, 'master.m3u8');
            if (!fs.existsSync(masterPlaylistPath)) {
                console.log(`Master playlist not found: ${masterPlaylistPath}`);
                return resolve([false, 'master_playlist_not_found']);
            }
            
            // Check if source directory exists
            const sourceDir = path.join(streamDir, 'source');
            if (!fs.existsSync(sourceDir)) {
                console.log(`Source directory not found: ${sourceDir}`);
                return resolve([false, 'source_dir_not_found']);
            }
            
            // Check source index.m3u8 file
            const indexPath = path.join(sourceDir, 'index.m3u8');
            if (!fs.existsSync(indexPath)) {
                console.log(`Index file not found: ${indexPath}`);
                return resolve([false, 'index_file_not_found']);
            }
            
            // Check if the index.m3u8 file has been modified recently
            const stats = fs.statSync(indexPath);
            const fileModTime = stats.mtime;
            const currentTime = new Date();
            const diffSeconds = (currentTime - fileModTime) / 1000;
            
            console.log(`Index file last modified ${diffSeconds.toFixed(1)} seconds ago`);
            
            // If the file hasn't been updated in the last 60 seconds, the stream is probably offline
            if (diffSeconds > 60) {
                return resolve([false, `index_file_stale_${diffSeconds.toFixed(1)}s`]);
            }
            
            // Check for recent segment files
            try {
                const segmentFiles = fs.readdirSync(sourceDir).filter(file => file.endsWith('.ts'));
                console.log(`Found ${segmentFiles.length} segment files`);
                
                if (segmentFiles.length === 0) {
                    return resolve([false, 'no_segment_files']);
                }
                
                // Get the most recent segment file
                const mostRecentSegment = segmentFiles
                    .map(file => ({
                        name: file,
                        time: fs.statSync(path.join(sourceDir, file)).mtime
                    }))
                    .sort((a, b) => b.time - a.time)[0];
                
                if (mostRecentSegment) {
                    const segmentAge = (currentTime - mostRecentSegment.time) / 1000;
                    console.log(`Most recent segment (${mostRecentSegment.name}) is ${segmentAge.toFixed(1)} seconds old`);
                    
                    if (segmentAge > 40) {  // Increased from 20 to 40 seconds
                        return resolve([false, `segment_stale_${segmentAge.toFixed(1)}s`]);
                    }
                }
            } catch (err) {
                console.error(`Error checking segment files: ${err}`);
            }
            
            // If all checks pass, the stream appears to be active
            return resolve([true, '']);
        } catch (error) {
            console.error(`Error checking HLS activity for stream ${streamId}:`, error);
            // If there's an error in our check, assume the stream is inactive to be safe
            return resolve([false, `error_${error.message}`]);
        }
    });
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