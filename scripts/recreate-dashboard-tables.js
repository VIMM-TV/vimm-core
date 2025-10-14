/**
 * Recreate Dashboard Database Tables
 * 
 * This script drops and recreates the dashboard tables to fix schema issues.
 * USE WITH CAUTION - This will delete existing data!
 * 
 * Usage: node scripts/recreate-dashboard-tables.js
 */

require('dotenv').config();
const sequelize = require('../src/db/index');
const StreamStats = require('../src/db/models/streamStats');
const FollowerGrowth = require('../src/db/models/followerGrowth');
const BannedUsers = require('../src/db/models/bannedUsers');

async function recreateDashboardTables() {
  try {
    console.log('⚠️  WARNING: This will DELETE all existing dashboard data!');
    console.log('Recreating Dashboard Database Tables\n');
    console.log('='.repeat(60));

    // Connect to database
    console.log('\nConnecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');

    // Drop and recreate StreamStats table
    console.log('Recreating stream_stats table...');
    await StreamStats.sync({ force: true });
    console.log('✓ stream_stats table recreated');

    // Drop and recreate FollowerGrowth table
    console.log('Recreating follower_growth table...');
    await FollowerGrowth.sync({ force: true });
    console.log('✓ follower_growth table recreated');

    // Drop and recreate BannedUsers table
    console.log('Recreating banned_users table...');
    await BannedUsers.sync({ force: true });
    console.log('✓ banned_users table recreated');

    console.log('\n' + '='.repeat(60));
    console.log('✅ All dashboard tables recreated successfully!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('  1. Run: node scripts/seed-dashboard-data.js');
    console.log('  2. Test endpoints with: node scripts/test-dashboard-endpoints.js');

  } catch (error) {
    console.error('\n❌ Fatal error recreating tables:', error);
    console.error('\nDetails:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the script
recreateDashboardTables().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
