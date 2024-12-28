const express = require('express');
const path = require('path');
const NodeMediaServer = require('node-media-server');
const sequelize = require('../db');
const nmsConfig = require('./nms-config');
const authRoutes = require('../api/routes/auth');
const { validateStreamKey, getUserByStreamKey, getStreamByHiveAccount, setStreamId } = require('../auth/streamkey');

const app = express();
const nms = new NodeMediaServer(nmsConfig);

// Initialize database and create tables
async function initializeDatabase() {
    try {
        await sequelize.sync();
        console.log('Database synchronized successfully');
    } catch (error) {
        console.error('Error synchronizing database:', error);
        process.exit(1);
    }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web/public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/live', express.static(path.join(__dirname, '../../media/live')));

app.get('/api/stream/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        const { type } = req.query; // 'hiveAccount' or 'streamKey'
        
        let streamId;
        if (type === 'hiveAccount') {
            // Logic to fetch stream ID by hiveAccount
            streamId = await getStreamByHiveAccount(identifier);
        } else if (type === 'streamKey') {
            // Logic to fetch stream ID by streamKey
            streamId = await getStreamIdByStreamKey(identifier);
        } else {
            return res.status(400).json({ error: 'Invalid identifier type' });
        }
        
        if (!streamId) {
            return res.status(404).json({ error: 'Stream not found' });
        }
        
        // Return the RTMP stream path/ID
        res.json({
            streamId: streamId.streamID,
            rtmpPath: `rtmp://localhost/live/${streamId.streamID}`
        });
    } catch (error) {
        console.error('Error fetching stream:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Initialize database and start servers
initializeDatabase().then(() => {
    // Start HTTP server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`HTTP Server running on port ${PORT}`);
    });

    nms.on('preConnect', (id, args) => {
        console.log('[NodeEvent on preConnect]', {
            id,
            args
        });
        
        // Store the session ID in args so it's available for later
        args.sessionId = id;
        return;
    });

    // Set up Node-Media-Server authentication
    nms.on('prePublish', async (id, StreamPath, args) => {
        console.log('[NodeEvent on prePublish]', {
            id,
            StreamPath,
            args
        });
    
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
                console.log('[Authentication Failed]', `Invalid stream key: ${streamKey}`);
                const session = nms.getSession(id);
                session.reject({
                    code: 'NetConnection.Connect.Rejected',
                    description: 'Invalid stream key'
                });
    
                if (session.pushStream) {
                    session.pushStream.stop();
                }
                session.stop();
            } else {
                console.log('[Authentication Success]', `Valid stream key: ${streamKey}`);
                const user = await getUserByStreamKey(streamKey);
                if (user) {
                    await setStreamId(user.hiveAccount, id);
                    console.log(`[Stream ID Set] Stream ID ${id} set for Hive account ${user.hiveAccount}`);
                }
            }
        } catch (error) {
            console.error('[Authentication Error]', error);
            const session = nms.getSession(id);
            session.reject();
        }
    });

    // Optional: Log when streams start/end
    nms.on('postPublish', (id, StreamPath, args) => {
        console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath}`);
    });

    nms.on('donePublish', (id, StreamPath, args) => {
        console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath}`);
    });

    // Monitor HLS segment generation
    nms.on('postTranscode', (id, StreamPath, args) => {
        console.log('[Transcode]', `Stream ${StreamPath} transcoding started`);
    });

    nms.on('doneTranscode', (id, StreamPath, args) => {
        console.log('[Transcode]', `Stream ${StreamPath} transcoding finished`);
        execSync(`rm -rf ./media/live/${id}`);
    });

    // Run Node Media Server
    try {
        nms.run();
        console.log('Media server running on RTMP port 1935 and HTTP port 8000');
    } catch (error) {
        console.error('Error starting media server:', error);
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
