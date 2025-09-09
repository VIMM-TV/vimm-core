const path = require('path');

/**
 * Database configuration module that reads from environment variables
 * with fallback to sensible defaults. Supports SQLite, MySQL, and PostgreSQL.
 */

const dbConfig = {
  // Database dialect - supports 'sqlite', 'mysql', 'postgres'
  dialect: process.env.DB_DIALECT || 'sqlite',
  
  // Database connection details
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || getDefaultPort(),
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'vimm_core',
  username: process.env.DB_USERNAME || process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  
  // SQLite specific - storage file path
  storage: process.env.DB_STORAGE || path.join(__dirname, '../../database.sqlite'),
  
  // Sequelize options
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  
  // Connection pool settings
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 5,
    min: parseInt(process.env.DB_POOL_MIN) || 0,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000
  }
};

function getDefaultPort() {
  const dialect = process.env.DB_DIALECT || 'sqlite';
  switch (dialect) {
    case 'mysql':
      return 3306;
    case 'postgres':
      return 5432;
    case 'sqlite':
    default:
      return null;
  }
}

/**
 * Get Sequelize configuration object
 */
function getSequelizeConfig() {
  const config = {
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool
  };

  if (dbConfig.dialect === 'sqlite') {
    config.storage = dbConfig.storage;
  } else {
    config.host = dbConfig.host;
    config.port = dbConfig.port;
    config.database = dbConfig.database;
    config.username = dbConfig.username;
    config.password = dbConfig.password;
  }

  return config;
}

/**
 * Get configuration for config.json format (for Sequelize CLI compatibility)
 */
function getLegacyConfig() {
  const environments = ['development', 'test', 'production'];
  const config = {};
  
  environments.forEach(env => {
    config[env] = getSequelizeConfig();
  });
  
  return config;
}

module.exports = {
  dbConfig,
  getSequelizeConfig,
  getLegacyConfig
};