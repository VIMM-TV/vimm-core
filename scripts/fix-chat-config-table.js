/**
 * Script to fix the chat_configs table by dropping and recreating it
 * This will delete any existing chat configuration data
 */

const sequelize = require('../src/db/index');

async function fixChatConfigTable() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully.');

    // Drop the chat_configs table if it exists
    console.log('Dropping chat_configs table...');
    await sequelize.query('DROP TABLE IF EXISTS chat_configs;');
    console.log('Table dropped successfully.');

    console.log('Done! You can now run npm start to recreate the table with the correct schema.');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing table:', error);
    process.exit(1);
  }
}

fixChatConfigTable();
