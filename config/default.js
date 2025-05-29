const config = {
    transcoding: true,
    // WatchURL: This is for the URL that will be included in the Hive posts for each stream.
    // It should point to the player page where the stream can be watched.
    // Example: 'https://yourdomain/watch'
    // The resulting URL will be 'https://yourdomain/watch?user=<USERNAME>'
    // If you're using vimm-frontend, it should be set to the frontend 'watch' URL.
    // If you're using vimm-core alone, it should point to player.html.
    watchUrl: {
        protocol: 'http',
        domain: 'vimm.webhop.me:3002',
        path: '/watch'
    }
};

module.exports = config;