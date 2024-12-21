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
    field: 'hive_account'
  },
  streamKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'stream_key'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastUsed: {
    type: DataTypes.DATE,
    field: 'last_used'
  }
}, {
  tableName: 'stream_keys',
  timestamps: true, // This will add createdAt and updatedAt fields
  underscored: true // This will use snake_case for column names
});

module.exports = StreamKey;
