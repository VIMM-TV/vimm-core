const { Sequelize } = require('sequelize');
const { getSequelizeConfig } = require('./config');

const config = getSequelizeConfig();
const sequelize = new Sequelize(config);

// Test the connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log(`Database connection established successfully (${config.dialect}).`);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

testConnection();

module.exports = sequelize;
