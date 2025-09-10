const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const FollowedChannels = sequelize.define('FollowedChannels', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  followerHiveAccount: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'follower_hive_account',
    references: {
      model: 'stream_keys',
      key: 'hive_account'
    }
  },
  followedHiveAccount: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'followed_hive_account',
    references: {
      model: 'stream_keys', 
      key: 'hive_account'
    }
  }
}, {
  tableName: 'followed_channels',
  timestamps: true,
  underscored: true,
  // Ensure a user can only follow a channel once
  indexes: [
    {
      unique: true,
      fields: ['follower_hive_account', 'followed_hive_account']
    }
  ]
});

module.exports = FollowedChannels;