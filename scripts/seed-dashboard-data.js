/**
 * Seed Sample Dashboard Data
 * 
 * This script creates sample data for testing the dashboard API endpoints.
 * It populates StreamStats, FollowerGrowth, and BannedUsers tables with test data.
 * 
 * Usage: node scripts/seed-dashboard-data.js
 * 
 * WARNING: This is for development/testing only!
 */

require('dotenv').config();
const sequelize = require('../src/db/index');
const StreamKey = require('../src/db/models/streamKey');
const StreamStats = require('../src/db/models/streamStats');
const FollowerGrowth = require('../src/db/models/followerGrowth');
const BannedUsers = require('../src/db/models/bannedUsers');
const FollowedChannels = require('../src/db/models/followedChannels');

async function seedDashboardData() {
  try {
    console.log('Starting dashboard data seeding...\n');

    // Ensure database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.\n');

    // Create tables if they don't exist
    console.log('Ensuring tables exist...');
    await StreamStats.sync({ force: false });
    await FollowerGrowth.sync({ force: false });
    await BannedUsers.sync({ force: false });
    console.log('✓ Tables verified/created\n');

    // Get first active channel for testing
    const testChannel = await StreamKey.findOne({
      where: { isActive: true }
    });

    if (!testChannel) {
      console.error('No active channels found. Please create a channel first.');
      process.exit(1);
    }

    const username = testChannel.hiveAccount;
    console.log(`Using test channel: ${username}\n`);

    // 1. Seed StreamStats
    console.log('1. Seeding StreamStats...');
    const streamStats = await StreamStats.create({
      hiveAccount: username,
      streamID: testChannel.streamID || 'TEST_STREAM_001',
      sessionStart: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      sessionEnd: null, // Still live
      peakViewers: 42,
      totalWatchTime: 180, // 180 minutes
      chatMessages: 256,
      newFollowers: 5
    });
    console.log(`✓ Created StreamStats record with ${streamStats.peakViewers} peak viewers\n`);

    // 2. Seed FollowerGrowth (last 30 days)
    console.log('2. Seeding FollowerGrowth (30 days)...');
    let baseFollowers = 100;
    let growthRecordsCreated = 0;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Simulate growth with some randomness
      const growth = Math.floor(Math.random() * 5) + 1; // 1-5 new followers per day
      baseFollowers += growth;
      
      try {
        // Use findOrCreate to avoid unique constraint issues
        const [record, created] = await FollowerGrowth.findOrCreate({
          where: {
            hiveAccount: username,
            date: dateStr
          },
          defaults: {
            followerCount: baseFollowers
          }
        });
        
        // If record already exists, update it
        if (!created) {
          await record.update({ followerCount: baseFollowers });
        }
        growthRecordsCreated++;
      } catch (error) {
        console.error(`  Error creating growth record for ${dateStr}:`, error.message);
      }
    }
    
    console.log(`✓ Created ${growthRecordsCreated} days of follower growth data`);
    console.log(`  Starting followers: 100`);
    console.log(`  Current followers: ${baseFollowers}\n`);

    // 3. Seed some actual followers
    console.log('3. Seeding FollowedChannels...');
    const followerUsernames = [
      'follower1', 'follower2', 'follower3', 'follower4', 'follower5',
      'viewer123', 'fan456', 'supporter789'
    ];

    let followersCreated = 0;
    for (const followerUsername of followerUsernames) {
      try {
        await FollowedChannels.create({
          followerHiveAccount: followerUsername,
          followedHiveAccount: username
        });
        followersCreated++;
      } catch (error) {
        // Ignore duplicate errors
        if (!error.message.includes('unique')) {
          console.error(`  Error creating follower ${followerUsername}:`, error.message);
        }
      }
    }
    console.log(`✓ Created ${followersCreated} follower relationships\n`);

    // 4. Seed BannedUsers
    console.log('4. Seeding BannedUsers...');
    const bannedUsersData = [
      {
        channelHiveAccount: username,
        bannedUsername: 'spammer123',
        bannedBy: username,
        reason: 'Excessive spam',
        bannedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      {
        channelHiveAccount: username,
        bannedUsername: 'troll456',
        bannedBy: 'moderator1',
        reason: 'Harassment',
        bannedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        channelHiveAccount: username,
        bannedUsername: 'toxic789',
        bannedBy: username,
        reason: 'Toxic behavior',
        bannedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    ];

    let bansCreated = 0;
    for (const banData of bannedUsersData) {
      try {
        await BannedUsers.create(banData);
        bansCreated++;
      } catch (error) {
        // Ignore duplicate errors
        if (!error.message.includes('unique')) {
          console.error(`  Error creating ban:`, error.message);
        }
      }
    }
    console.log(`✓ Created ${bansCreated} banned user records\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('Seeding Complete!');
    console.log('='.repeat(60));
    console.log(`Test Channel: ${username}`);
    console.log(`Stream Stats: 1 active session`);
    console.log(`Follower Growth: 30 days of data`);
    console.log(`Followers: ${followersCreated} relationships`);
    console.log(`Banned Users: ${bansCreated} records`);
    console.log('='.repeat(60));
    console.log('\nYou can now test the API endpoints with this data:');
    console.log(`  GET /api/streams/stats/${username}`);
    console.log(`  GET /api/streams/followers/growth/${username}?days=30`);
    console.log(`  GET /api/chat/banned/${username}`);

  } catch (error) {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run the script
seedDashboardData().then(() => {
  console.log('\nScript finished successfully');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
