import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const migrationSQL = fs.readFileSync('./database/migrations/001_add_backend_fields.sql', 'utf8');

async function runMigration() {
  try {
    console.log('Running migration...');
    await pool.query(migrationSQL);
    console.log('Migration completed successfully!');
    await pool.end();
  } catch (error) {
    console.error('Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
