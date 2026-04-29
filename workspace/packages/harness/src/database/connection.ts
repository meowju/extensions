/**
 * Database Connection Manager
 * Handles database connections, pooling, and lifecycle management
 */

import { getConfig } from '../config/index.js';
import { logger } from '../logger/index.js';

export interface DatabaseConnection {
  /**
   * Execute a query with parameters
   */
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute a single query and return the first result
   */
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>;

  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   * Returns the number of affected rows
   */
  execute(sql: string, params?: unknown[]): Promise<number>;

  /**
   * Execute multiple statements in a transaction
   */
  transaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;

  /**
   * Check if the connection is healthy
   */
  ping(): Promise<boolean>;

  /**
   * Close the connection
   */
  close(): Promise<void>;
}

export interface TransactionContext {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<number>;
}

/**
 * SQLite Database Implementation
 */
export class SQLiteDatabase implements DatabaseConnection {
  private db: import('better-sqlite3').Database | null = null;
  private dbPath: string;
  private verbose: boolean;
  private initialized = false;

  constructor() {
    const config = getConfig();
    this.dbPath = config.DATABASE_PATH;
    this.verbose = config.DATABASE_VERBOSE;
  }

  /**
   * Initialize the database connection
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const Database = (await import('better-sqlite3')).default;
      const { dirname } = await import('path');
      const { existsSync, mkdirSync } = await import('fs');

      // Ensure directory exists
      const dir = dirname(this.dbPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      this.db = new Database(this.dbPath, {
        verbose: this.verbose ? console.log : undefined,
      });

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Run migrations
      await this.runMigrations();

      this.initialized = true;
      logger.info('SQLite database connected', { path: this.dbPath });
    } catch (error) {
      logger.error('Failed to connect to SQLite database', error as Error);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const log = logger.child('migrations');

    // Create migrations tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    const applied = this.db
      .prepare('SELECT name FROM _migrations')
      .all()
      .map((row: { name: string }) => row.name);

    const migrations: Array<{ name: string; up: string; down?: string }> = [
      {
        name: '001_initial_schema',
        up: `
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );

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

          CREATE TABLE IF NOT EXISTS auth_tokens (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
          CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
          CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
          CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON auth_tokens(expires_at);
        `,
      },
      {
        name: '002_seed_data',
        up: `
          INSERT OR IGNORE INTO users (id, email, name, password_hash, salt)
          VALUES ('seed-admin-001', 'admin@example.com', 'Admin User', 'placeholder', 'default');
        `,
      },
    ];

    for (const migration of migrations) {
      if (!applied.includes(migration.name)) {
        log.info(`Applying migration: ${migration.name}`);

        const applyMigration = this.db!.transaction(() => {
          this.db!.exec(migration.up);
          this.db!.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name);
        });

        applyMigration();
        log.info(`Migration ${migration.name} applied successfully`);
      }
    }
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    this.ensureConnected();
    const stmt = this.db!.prepare(sql);
    return (params ? stmt.all(...params) : stmt.all()) as T[];
  }

  async queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    this.ensureConnected();
    const stmt = this.db!.prepare(sql);
    const result = params ? stmt.get(...params) : stmt.get();
    return (result as T) || null;
  }

  async execute(sql: string, params?: unknown[]): Promise<number> {
    this.ensureConnected();
    const stmt = this.db!.prepare(sql);
    const result = params ? stmt.run(...params) : stmt.run();
    return result.changes;
  }

  async transaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    this.ensureConnected();

    const txContext: TransactionContext = {
      query: async <Q>(sql: string, params?: unknown[]) => {
        const stmt = this.db!.prepare(sql);
        return (params ? stmt.all(...params) : stmt.all()) as Q[];
      },
      queryOne: async <Q>(sql: string, params?: unknown[]) => {
        const stmt = this.db!.prepare(sql);
        const result = params ? stmt.get(...params) : stmt.get();
        return (result as Q) || null;
      },
      execute: async (sql: string, params?: unknown[]) => {
        const stmt = this.db!.prepare(sql);
        const result = params ? stmt.run(...params) : stmt.run();
        return result.changes;
      },
    };

    const transaction = this.db!.transaction(async () => {
      return fn(txContext);
    });

    return transaction();
  }

  async ping(): Promise<boolean> {
    try {
      this.ensureConnected();
      this.db!.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      logger.info('SQLite database connection closed');
    }
  }

  private ensureConnected(): void {
    if (!this.db || !this.initialized) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }
}

/**
 * Create database instance based on configuration
 */
export function createDatabase(): DatabaseConnection {
  const config = getConfig();

  if (config.DATABASE_URL) {
    // In production, you would implement PostgreSQL/MySQL connection here
    // For now, fall back to SQLite
    logger.warn('DATABASE_URL specified but not implemented, using SQLite');
  }

  return new SQLiteDatabase();
}

// Singleton database instance
let dbInstance: DatabaseConnection | null = null;

export async function getDatabase(): Promise<DatabaseConnection> {
  if (!dbInstance) {
    dbInstance = createDatabase();
    await dbInstance.connect();
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
