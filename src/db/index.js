const { Sequelize } = require('sequelize');
const path = require('path');

// Get database path from environment variable or use default
const dbPath = process.env.DATABASE_PATH || '/root/database.sqlite';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false // Set to console.log to see SQL queries
});

// Test the connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

testConnection();

module.exports = sequelize;
