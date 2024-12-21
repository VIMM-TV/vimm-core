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
        console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
        
        const streamKey = args.key;
        
        try {
            const isValid = await validateStreamKey(streamKey);
            if (!isValid) {
                console.log('[Authentication Failed]', `Invalid stream key: ${streamKey}`);
                const session = nms.getSession(id);
                session.reject();
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
        console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    });

    nms.on('donePublish', (id, StreamPath, args) => {
        console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
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
    // Don't exit the process, just log the error
});
