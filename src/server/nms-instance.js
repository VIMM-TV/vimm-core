const NodeMediaServer = require('node-media-server');
const config = require('./nms-config');

// Create a single instance of NodeMediaServer
const nms = new NodeMediaServer(config);

// Export the single instance without running it
module.exports = nms;