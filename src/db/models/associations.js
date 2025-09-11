const StreamKey = require('./streamKey');
const ChatConfig = require('./chatConfig');
const FollowedChannels = require('./followedChannels');

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

// FollowedChannels associations
StreamKey.hasMany(FollowedChannels, {
  foreignKey: 'follower_hive_account',
  sourceKey: 'hiveAccount',
  as: 'following'
});

StreamKey.hasMany(FollowedChannels, {
  foreignKey: 'followed_hive_account',
  sourceKey: 'hiveAccount',
  as: 'followers'
});

FollowedChannels.belongsTo(StreamKey, {
  foreignKey: 'follower_hive_account',
  targetKey: 'hiveAccount',
  as: 'follower'
});

FollowedChannels.belongsTo(StreamKey, {
  foreignKey: 'followed_hive_account',
  targetKey: 'hiveAccount',
  as: 'followed'
});

module.exports = {
  StreamKey,
  ChatConfig,
  FollowedChannels
};