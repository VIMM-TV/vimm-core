const config = {
    transcoding: false,
    // WatchURL: This is for the URL that will be included in the Hive posts for each stream.
    // It should point to the player page where the stream can be watched.
    // Example: 'https://yourdomain/watch'
    // The resulting URL will be 'https://yourdomain/watch?user=<USERNAME>'
    // If you're using vimm-frontend, it should be set to the frontend 'watch' URL.
    // If you're using vimm-core alone, it should point to player.html.
    watchUrl: {
        protocol: 'http',
        domain: 'vimm.webhop.me',
        path: '/watch'
    },
    // Thumbnail generation configuration
    thumbnails: {
        enabled: true,
        maxResolution: '640x360', // Maximum resolution for thumbnails (format: WIDTHxHEIGHT)
        quality: 2, // JPEG quality (1-31, lower is better quality)
        interval: 5 * 60 * 1000, // Generation interval in milliseconds (5 minutes)
        thumbnailDir: './media/thumbnails', // Directory to store thumbnails
        keepCount: 5 // Number of historical thumbnails to keep per stream
    }
};

module.exports = config;