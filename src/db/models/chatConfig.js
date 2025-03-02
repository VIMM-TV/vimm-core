const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const ChatConfig = sequelize.define('ChatConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Keep stream_id for reference, but not as a foreign key
  streamID: {
    type: DataTypes.STRING,
    allowNull: true, // Change to true since it might not always have a value
    field: 'stream_id',
    unique: true
  },
  // Add hive_account field to use as foreign key
  hiveAccount: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'hive_account',
    references: {
      model: 'stream_keys',
      key: 'hive_account'
    }
  },
  chatEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'chat_enabled'
  },
  moderationLevel: {
    type: DataTypes.ENUM('none', 'low', 'medium', 'high'),
    defaultValue: 'medium',
    field: 'moderation_level'
  },
  allowLinks: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'allow_links'
  },
  slowMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'slow_mode'
  },
  slowModeInterval: {
    type: DataTypes.INTEGER,
    defaultValue: 3, // seconds
    field: 'slow_mode_interval'
  },
  subscriberOnlyMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'subscriber_only_mode'
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'room_id'
  },
  customWelcomeMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'custom_welcome_message'
  }
}, {
  tableName: 'chat_configs',
  timestamps: true,
  underscored: true
});

module.exports = ChatConfig;