const NodeMediaServer = require('node-media-server');
const config = require('./nms-config');

class MediaServer {
    constructor() {
        this.nms = new NodeMediaServer(config);
        this.isInitialized = false;
    }

    async initialize() {
        if (!this.isInitialized) {
            await new Promise((resolve, reject) => {
                this.nms.run();
                // Give NMS a moment to initialize its internal systems
                setTimeout(() => {
                    this.isInitialized = true;
                    resolve();
                }, 1000);
            });
        }
        return this.nms;
    }

    getInstance() {
        return this.nms;
    }
}

module.exports = new MediaServer();