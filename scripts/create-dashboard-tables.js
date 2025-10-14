/**
 * Create Dashboard Database Tables
 * 
 * This script creates the necessary database tables for dashboard functionality.
 * Run this before seeding data or if tables are missing.
 * 
 * Usage: node scripts/create-dashboard-tables.js
 */

require('dotenv').config();
const sequelize = require('../src/db/index');
const StreamStats = require('../src/db/models/streamStats');
const FollowerGrowth = require('../src/db/models/followerGrowth');
const BannedUsers = require('../src/db/models/bannedUsers');

async function createDashboardTables() {
  try {
    console.log('Creating Dashboard Database Tables\n');
    console.log('='.repeat(60));

    // Connect to database
    console.log('\nConnecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');

    // Create StreamStats table
    console.log('Creating stream_stats table...');
    await StreamStats.sync({ alter: true });
    console.log('✓ stream_stats table created/updated');

    // Create FollowerGrowth table
    console.log('Creating follower_growth table...');
    await FollowerGrowth.sync({ alter: true });
    console.log('✓ follower_growth table created/updated');

    // Create BannedUsers table
    console.log('Creating banned_users table...');
    await BannedUsers.sync({ alter: true });
    console.log('✓ banned_users table created/updated');

    console.log('\n' + '='.repeat(60));
    console.log('✅ All dashboard tables created successfully!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('  1. Run: node scripts/seed-dashboard-data.js');
    console.log('  2. Test endpoints with: node scripts/test-dashboard-endpoints.js');

  } catch (error) {
    console.error('\n❌ Fatal error creating tables:', error);
    console.error('\nDetails:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the script
createDashboardTables().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
