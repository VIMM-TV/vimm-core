require('dotenv').config();
const sequelize = require('../index');

async function runMigration() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('Starting migration: Adding permlink column to stream_keys table...');
    
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('stream_keys');
    
    if (tableDescription.permlink) {
      console.log('Column "permlink" already exists in stream_keys table. Skipping...');
      process.exit(0);
    }
    
    // Add the column
    await queryInterface.addColumn('stream_keys', 'permlink', {
      type: sequelize.Sequelize.STRING,
      allowNull: true,
      after: 'stream_category' // This won't work in SQLite but included for other DBs
    });
    
    console.log('✓ Successfully added permlink column to stream_keys table');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
