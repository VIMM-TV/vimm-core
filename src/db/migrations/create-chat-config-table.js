'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('chat_configs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      stream_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        references: {
          model: 'stream_keys',
          key: 'stream_id'
        }
      },
      chat_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      moderation_level: {
        type: Sequelize.ENUM('none', 'low', 'medium', 'high'),
        defaultValue: 'medium'
      },
      allow_links: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      slow_mode: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      slow_mode_interval: {
        type: Sequelize.INTEGER,
        defaultValue: 3
      },
      subscriber_only_mode: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      room_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      custom_welcome_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('chat_configs');
  }
};