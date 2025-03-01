const { Sequelize } = require('sequelize');
const path = require('path');
const sequelize = require('../index');

async function migrate() {
    try {
        // First, check if columns exist using PRAGMA
        const [columns] = await sequelize.query(`PRAGMA table_info(stream_keys)`);
        
        // Extract column names
        const columnNames = columns.map(col => col.name);
        
        // Add isLive column if it doesn't exist
        if (!columnNames.includes('is_live')) {
            await sequelize.query(`
                ALTER TABLE stream_keys
                ADD COLUMN is_live BOOLEAN DEFAULT 0
            `);
            console.log('Added is_live column');
        }
        
        // Add viewerCount column if it doesn't exist
        if (!columnNames.includes('viewer_count')) {
            await sequelize.query(`
                ALTER TABLE stream_keys
                ADD COLUMN viewer_count INTEGER DEFAULT 0
            `);
            console.log('Added viewer_count column');
        }
        
        // Add streamStarted column if it doesn't exist
        if (!columnNames.includes('stream_started')) {
            await sequelize.query(`
                ALTER TABLE stream_keys
                ADD COLUMN stream_started DATETIME
            `);
            console.log('Added stream_started column');
        }
        
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

// Execute migration and handle errors
migrate().then(() => {
    console.log('Migration script completed.');
    process.exit(0);
}).catch(err => {
    console.error('Migration failed with error:', err);
    process.exit(1);
});