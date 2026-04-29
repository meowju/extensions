/**
 * Migration runner script
 * Run with: npx tsx src/database/migrations.ts
 */

import { initDatabase, closeDatabase, runMigrations } from './index.js';
import { getDatabase } from './index.js';

async function main() {
  console.log('🚀 Starting database migration...\n');

  try {
    // Initialize database
    console.log('📦 Initializing database...');
    initDatabase({ verbose: true });
    console.log('✅ Database initialized\n');

    // Get the database instance
    const db = getDatabase();

    // Run migrations
    console.log('🔄 Running migrations...');
    runMigrations(db);
    console.log('✅ All migrations applied\n');

    // Verify tables exist
    console.log('🔍 Verifying schema...');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE '_%'
    `).all();
    
    console.log('Tables created:');
    tables.forEach((table: { name: string }) => {
      console.log(`  - ${table.name}`);
    });
    console.log('');

    // Show migration history
    console.log('📜 Migration history:');
    const migrations = db.prepare(`
      SELECT name, applied_at FROM _migrations ORDER BY id
    `).all();
    
    migrations.forEach((m: { name: string; applied_at: string }) => {
      console.log(`  - ${m.name} (${m.applied_at})`);
    });
    console.log('');

    console.log('✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

main();
