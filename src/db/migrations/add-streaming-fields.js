const { Sequelize } = require('sequelize');
const path = require('path');
const sequelize = require('../index');

async function migrate() {
    try {
        // Add isLive column if it doesn't exist
        await sequelize.query(`
            ALTER TABLE stream_keys
            ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT 0
        `);
        
        // Add viewerCount column if it doesn't exist
        await sequelize.query(`
            ALTER TABLE stream_keys
            ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0
        `);
        
        // Add streamStarted column if it doesn't exist
        await sequelize.query(`
            ALTER TABLE stream_keys
            ADD COLUMN IF NOT EXISTS stream_started DATETIME
        `);
        
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

migrate();