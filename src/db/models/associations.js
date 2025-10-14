const StreamKey = require('./streamKey');
const ChatConfig = require('./chatConfig');
const FollowedChannels = require('./followedChannels');
const StreamStats = require('./streamStats');
const FollowerGrowth = require('./followerGrowth');
const BannedUsers = require('./bannedUsers');

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

// StreamStats associations
StreamKey.hasMany(StreamStats, {
  foreignKey: 'hive_account',
  sourceKey: 'hiveAccount',
  as: 'streamStats'
});

StreamStats.belongsTo(StreamKey, {
  foreignKey: 'hive_account',
  targetKey: 'hiveAccount'
});

// FollowerGrowth associations
StreamKey.hasMany(FollowerGrowth, {
  foreignKey: 'hive_account',
  sourceKey: 'hiveAccount',
  as: 'followerGrowth'
});

FollowerGrowth.belongsTo(StreamKey, {
  foreignKey: 'hive_account',
  targetKey: 'hiveAccount'
});

// BannedUsers associations
StreamKey.hasMany(BannedUsers, {
  foreignKey: 'channel_hive_account',
  sourceKey: 'hiveAccount',
  as: 'bannedUsers'
});

BannedUsers.belongsTo(StreamKey, {
  foreignKey: 'channel_hive_account',
  targetKey: 'hiveAccount',
  as: 'channel'
});

module.exports = {
  StreamKey,
  ChatConfig,
  FollowedChannels,
  StreamStats,
  FollowerGrowth,
  BannedUsers
};