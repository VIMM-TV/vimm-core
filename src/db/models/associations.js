const StreamKey = require('./streamKey');
const ChatConfig = require('./chatConfig');

// Define associations
StreamKey.hasOne(ChatConfig, {
  foreignKey: 'hive_account',
  sourceKey: 'hiveAccount',
  as: 'chatConfig'
});

ChatConfig.belongsTo(StreamKey, {
  foreignKey: 'hive_account',
  targetKey: 'hiveAccount'
});

module.exports = {
  StreamKey,
  ChatConfig
};