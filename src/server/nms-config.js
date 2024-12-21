const config = {
  logType: 3, // 0 - no log, 1 - error log, 2 - warning log, 3 - debug log
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: './media', // Where media files will be stored
  },
  auth: {
    play: false,    // Don't require authentication for viewers
    publish: true   // Require authentication for publishers
  }
};

module.exports = config;
