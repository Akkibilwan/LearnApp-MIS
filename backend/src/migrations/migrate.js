const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');

    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(filename)
      )
    `);

    // Get list of executed migrations
    const result = await query('SELECT filename FROM migrations ORDER BY executed_at');
    const executedMigrations = result.rows.map(row => row.filename);

    // Get all migration files
    const migrationDir = __dirname;
    const migrationFiles = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Execute pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        console.log(`Executing migration: ${file}`);
        
        const migrationPath = path.join(migrationDir, file);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        try {
          await query(migrationSQL);
          await query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
          console.log(`✓ Migration ${file} completed successfully`);
        } catch (error) {
          console.error(`✗ Migration ${file} failed:`, error);
          throw error;
        }
      } else {
        console.log(`Skipping already executed migration: ${file}`);
      }
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };