const sequelize = require('./index');
const StreamKey = require('./models/streamKey');
const ChatConfig = require('./models/chatConfig');
const FollowedChannels = require('./models/followedChannels');
const StreamStats = require('./models/streamStats');
const FollowerGrowth = require('./models/followerGrowth');
const BannedUsers = require('./models/bannedUsers');
const Associations = require('./models/associations');

async function initDatabase() {
  try {
    // This will create tables if they don't exist
    // Note: Using { alter: false } to avoid SQLite ALTER TABLE issues
    // New tables will be created, but existing tables won't be modified
    await sequelize.sync({ alter: false });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exit(1);
  }
}

module.exports = initDatabase;