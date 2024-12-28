const config = {
    logType: 3,
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
        mediaroot: './media', // This is where HLS files will be saved
        api: true
    },
    auth: {
        play: false, // Authentication is not need for playback of streams.
        publish: false // We disable NMS' built-in authentication to use our custom solution instead.
    }
};

module.exports = config;