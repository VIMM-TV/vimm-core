const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const BannedUsers = sequelize.define('BannedUsers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  channelHiveAccount: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'channel_hive_account',
    comment: 'The channel owner who banned this user',
    references: {
      model: 'stream_keys',
      key: 'hive_account'
    }
  },
  bannedUsername: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'banned_username',
    comment: 'The username that was banned'
  },
  bannedBy: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'banned_by',
    comment: 'Moderator or channel owner who issued the ban'
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reason for the ban'
  },
  bannedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'banned_at'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether the ban is still active (false if unbanned)'
  }
}, {
  tableName: 'banned_users',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['channel_hive_account', 'banned_username'],
      where: {
        is_active: true
      }
    }
  ]
});

module.exports = BannedUsers;
