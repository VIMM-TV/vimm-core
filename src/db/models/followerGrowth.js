const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const FollowerGrowth = sequelize.define('FollowerGrowth', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  hiveAccount: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'hive_account'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date for this snapshot'
  },
  followerCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'follower_count',
    comment: 'Total number of followers on this date'
  }
}, {
  tableName: 'follower_growth',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      name: 'follower_growth_unique_hive_account_date',
      fields: ['hive_account', 'date']
    }
  ]
});

module.exports = FollowerGrowth;
