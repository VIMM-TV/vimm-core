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
  streamID: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false,
    field: 'stream_id'
  },
  streamTitle: {
    type: DataTypes.STRING(255),  // Limit title to 255 characters
    allowNull: true,
    field: 'stream_title'
  },
  streamDescription: {
    type: DataTypes.TEXT,         // TEXT type for longer descriptions
    allowNull: true,
    field: 'stream_description'
  },
  streamLanguage: {
    type: DataTypes.STRING(10),   // ISO language codes are typically 2-5 characters
    allowNull: true,
    field: 'stream_language'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastUsed: {
    type: DataTypes.DATE,
    field: 'last_used'
  },
  streamTitle: {
    type: DataTypes.STRING
  },
  streamDescription: {
    type: DataTypes.TEXT
  },
  streamLanguage: {
    type: DataTypes.STRING,
    defaultValue: 'en'
  },
  streamCategory: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'stream_keys',
  timestamps: true, // This will add createdAt and updatedAt fields
  underscored: true // This will use snake_case for column names
});

StreamKey.prototype.setStreamId = async function(streamId) {
  return this.update({ streamId });
};

module.exports = StreamKey;
