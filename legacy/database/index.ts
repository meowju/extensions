/**
 * Database connection and initialization
 * Uses better-sqlite3 for synchronous, lightweight database operations
 * Can be swapped for PostgreSQL/MySQL in production
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

export interface DatabaseConfig {
  path?: string;
  verbose?: boolean;
}

const DEFAULT_DB_PATH = join(process.cwd(), 'data', 'app.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function isInitialized(): boolean {
  return db !== null;
}

export function initDatabase(config: DatabaseConfig = {}): Database.Database {
  const { path = DEFAULT_DB_PATH, verbose = false } = config;

  // Ensure data directory exists
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(path, { verbose: verbose ? console.log : undefined });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Set up schema
  runMigrations(db);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function runMigrations(database: Database.Database): void {
  // Create migrations table if not exists
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Get applied migrations
  const applied = database
    .prepare('SELECT name FROM _migrations')
    .all()
    .map((row: { name: string }) => row.name);

  // Migration definitions
  const migrations: Array<{ name: string; sql: string }> = [
    {
      name: '001_initial_schema',
      sql: `
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Items table
        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          price REAL NOT NULL DEFAULT 0,
          quantity INTEGER NOT NULL DEFAULT 0,
          tags TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Auth tokens table
        CREATE TABLE IF NOT EXISTS auth_tokens (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
        CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON auth_tokens(expires_at);
      `,
    },
    {
      name: '002_seed_data',
      sql: `
        -- Seed default admin user if not exists
        INSERT OR IGNORE INTO users (id, email, name, password_hash, salt, created_at, updated_at)
        VALUES (
          'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          'admin@example.com',
          'Admin User',
          'placeholder_hash',
          'default-salt-placeholder',
          datetime('now'),
          datetime('now')
        );
      `,
    },
  ];

  // Apply pending migrations
  const applyMigration = database.transaction((migration: { name: string; sql: string }) => {
    console.log(`Applying migration: ${migration.name}`);
    database.exec(migration.sql);
    database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name);
    console.log(`Migration ${migration.name} applied successfully`);
  });

  for (const migration of migrations) {
    if (!applied.includes(migration.name)) {
      try {
        applyMigration(migration);
      } catch (error) {
        console.error(`Failed to apply migration ${migration.name}:`, error);
        throw error;
      }
    }
  }
}

// Export for testing
export { runMigrations };
