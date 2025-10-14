/**
 * Daily Follower Growth Snapshot Script
 * 
 * This script should be run daily (via cron job) to track follower growth over time.
 * It creates a snapshot of each channel's follower count for analytics.
 * 
 * Usage: node scripts/snapshot-follower-growth.js
 * Cron example: 0 0 * * * node /path/to/scripts/snapshot-follower-growth.js
 */

require('dotenv').config();
const { Op } = require('sequelize');
const sequelize = require('../src/db/index');
const StreamKey = require('../src/db/models/streamKey');
const FollowedChannels = require('../src/db/models/followedChannels');
const FollowerGrowth = require('../src/db/models/followerGrowth');

async function snapshotFollowerGrowth() {
  try {
    console.log('Starting follower growth snapshot...');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get all active channels
    const channels = await StreamKey.findAll({
      where: { isActive: true },
      attributes: ['hiveAccount']
    });

    console.log(`Found ${channels.length} active channels`);

    let successCount = 0;
    let errorCount = 0;

    // For each channel, count followers and create/update snapshot
    for (const channel of channels) {
      try {
        const followerCount = await FollowedChannels.count({
          where: { followedHiveAccount: channel.hiveAccount }
        });

        // Use upsert to create or update today's snapshot
        await FollowerGrowth.upsert({
          hiveAccount: channel.hiveAccount,
          date: today,
          followerCount: followerCount
        });

        console.log(`✓ ${channel.hiveAccount}: ${followerCount} followers`);
        successCount++;
      } catch (error) {
        console.error(`✗ Error processing ${channel.hiveAccount}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Snapshot Complete ===');
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total: ${channels.length}`);

  } catch (error) {
    console.error('Fatal error during follower growth snapshot:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run the script
snapshotFollowerGrowth().then(() => {
  console.log('Script finished successfully');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
