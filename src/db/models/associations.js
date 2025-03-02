const StreamKey = require('./streamKey');
const ChatConfig = require('./chatConfig');

// Define associations
StreamKey.hasOne(ChatConfig, {
  foreignKey: 'stream_id',
  sourceKey: 'streamID',
  as: 'chatConfig'
});

ChatConfig.belongsTo(StreamKey, {
  foreignKey: 'stream_id',
  targetKey: 'streamID'
});

module.exports = {
  StreamKey,
  ChatConfig
};