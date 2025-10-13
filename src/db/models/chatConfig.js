const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const ChatConfig = sequelize.define('ChatConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  hiveAccount: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'The Hive account of the channel owner'
  },
  slowMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Enable slow mode to limit message frequency'
  },
  slowModeInterval: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    comment: 'Seconds between messages when slow mode is active'
  },
  emoteOnly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Only allow emotes in chat'
  },
  subscribersOnly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Only subscribers can chat'
  },
  followersOnly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Only followers can chat'
  },
  followersOnlyDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Minimum follow duration in minutes (0 = any follower)'
  },
  moderators: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of Hive usernames with moderator privileges'
  }
}, {
  tableName: 'chat_configs',
  timestamps: true
});

module.exports = ChatConfig;
