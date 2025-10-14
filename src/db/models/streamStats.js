const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const StreamStats = sequelize.define('StreamStats', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  hiveAccount: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'hive_account',
    references: {
      model: 'stream_keys',
      key: 'hive_account'
    }
  },
  streamID: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'stream_id'
  },
  sessionStart: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'session_start'
  },
  sessionEnd: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'session_end'
  },
  peakViewers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'peak_viewers'
  },
  totalWatchTime: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total watch time in minutes',
    field: 'total_watch_time'
  },
  chatMessages: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'chat_messages'
  },
  newFollowers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'new_followers'
  }
}, {
  tableName: 'stream_stats',
  timestamps: true,
  underscored: true
});

module.exports = StreamStats;
