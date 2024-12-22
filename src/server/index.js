const express = require('express');
const path = require('path');
const NodeMediaServer = require('node-media-server');
const sequelize = require('../db');
const nmsConfig = require('./nms-config');
const authRoutes = require('../api/routes/auth');
const { validateStreamKey } = require('../auth/streamkey');

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

// Initialize database and start servers
initializeDatabase().then(() => {
    // Start HTTP server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`HTTP Server running on port ${PORT}`);
    });

    // Set up Node-Media-Server authentication
    nms.on('prePublish', async (id, StreamPath, args) => {
        console.log('[NodeEvent on prePublish]', {
            id,
            StreamPath,
            args
        });

        // Extract stream key from StreamPath
        // StreamPath format: '/live/stream-key'
        const streamKey = StreamPath.split('/')[2];
        
        console.log('[Stream Key Debug]', {
            fullPath: StreamPath,
            extractedKey: streamKey,
            argsKey: args.key
        });
        
        if (!streamKey) {
            console.error('[Authentication Failed] No stream key provided');
            const session = nms.getSession(id);
            session.reject();
            return;
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

                // Explicitly end the connection
                if (session.pushStream) {
                    session.pushStream.stop();
                }
                
                // Close the connection
                session.stop();
            } else {
                console.log('[Authentication Success]', `Valid stream key: ${streamKey}`);
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
