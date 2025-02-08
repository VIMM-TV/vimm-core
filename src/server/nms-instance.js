const NodeMediaServer = require('node-media-server');
const config = require('./nms-config');

// Create a single instance of NodeMediaServer
const nms = new NodeMediaServer(config);

// Start the server when this module is imported
nms.run();

// Export the single instance
module.exports = nms;