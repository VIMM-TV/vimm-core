const sequelize = require('./index');
const StreamKey = require('./models/streamKey');
const StreamKey = require('./models/chatConfig');
const StreamKey = require('./models/associations');

async function initDatabase() {
  try {
    // This will create tables if they don't exist and add missing columns
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exit(1);
  }
}

module.exports = initDatabase;