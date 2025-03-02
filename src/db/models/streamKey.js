const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const StreamKey = sequelize.define('StreamKey', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  hiveAccount: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'hive_account'
  },
  streamKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'stream_key'
  },
  streamID: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false,
    field: 'stream_id'
  },
  streamTitle: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'stream_title'
  },
  streamDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'stream_description'
  },
  streamLanguage: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'stream_language'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isLive: {              // NEW: Stream is currently live
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_live'
  },
  viewerCount: {         // NEW: Track viewer count
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'viewer_count'
  },
  streamStarted: {       // NEW: When stream started
    type: DataTypes.DATE,
    allowNull: true,
    field: 'stream_started'
  },
  lastUsed: {
    type: DataTypes.DATE,
    field: 'last_used'
  },
  streamCategory: {
    type: DataTypes.STRING,
    field: 'stream_category'
  }
}, {
  tableName: 'stream_keys',
  timestamps: true,
  underscored: true
});

// Fix: Use streamID not streamId in setter method for consistency
StreamKey.prototype.setStreamId = async function(streamId) {
  return this.update({ streamID: streamId });
};

module.exports = StreamKey;