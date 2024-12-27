const { getTranscodingConfig } = require('./transcoding');

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
        mediaroot: './media',
    },
    auth: {
        play: false,
        publish: true
    },
    trans: {
        ffmpeg: '/usr/bin/ffmpeg',
        tasks: [{
            ...getTranscodingConfig()
        }]
    }
};

module.exports = config;