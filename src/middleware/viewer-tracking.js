const viewerTracker = require('../server/viewer-tracker');

/**
 * Middleware to track viewer activity from HLS segment requests
 * This should be applied to routes that serve HLS content (playlists and segments)
 */
function trackViewerActivity(req, res, next) {
    // Extract stream ID from the request path
    // Typical paths: /live/STREAMID/master.m3u8, /live/STREAMID/720p/index.m3u8, etc.
    const pathMatch = req.path.match(/^\/live\/([^\/]+)/);
    
    if (pathMatch && pathMatch[1]) {
        const streamId = pathMatch[1];
        
        // Get viewer's IP address (accounting for proxies)
        const viewerIp = req.headers['x-forwarded-for'] 
            ? req.headers['x-forwarded-for'].split(',')[0].trim()
            : req.connection.remoteAddress || req.socket.remoteAddress;

        // Record the viewer activity
        viewerTracker.recordActivity(streamId, viewerIp);
    }

    next();
}

module.exports = {
    trackViewerActivity
};
