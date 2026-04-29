/**
 * User repository
 * Handles all database operations for users
 */

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import type { User, UserPublic, UserWithPassword, UserCreateInput, UserUpdateInput } from '../models/user.model.js';
import { UserModel } from '../models/user.model.js';
import { getDatabase } from '../index.js';

export interface IUserRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;
  create(data: UserCreateInput): Promise<User>;
  update(id: string, data: UserUpdateInput): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}

export class UserRepository implements IUserRepository {
  private get db() {
    return getDatabase();
  }

  async findAll(): Promise<User[]> {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    const rows = stmt.all() as Array<{
      id: string;
      email: string;
      name: string;
      created_at: string;
      updated_at: string;
    }>;
    return rows.map(row => UserModel.toEntity(row));
  }

  async findById(id: string): Promise<User | null> {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `);
    const row = stmt.get(id) as {
      id: string;
      email: string;
      name: string;
      created_at: string;
      updated_at: string;
    } | undefined;
    return row ? UserModel.toEntity(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at, updated_at 
      FROM users 
      WHERE email = ? COLLATE NOCASE
    `);
    const row = stmt.get(email.toLowerCase()) as {
      id: string;
      email: string;
      name: string;
      created_at: string;
      updated_at: string;
    } | undefined;
    return row ? UserModel.toEntity(row) : null;
  }

  async findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    const stmt = this.db.prepare(`
      SELECT id, email, name, password_hash, salt, created_at, updated_at 
      FROM users 
      WHERE email = ? COLLATE NOCASE
    `);
    const row = stmt.get(email.toLowerCase()) as {
      id: string;
      email: string;
      name: string;
      password_hash: string;
      salt: string;
      created_at: string;
      updated_at: string;
    } | undefined;
    return row ? UserModel.toWithPassword(row) : null;
  }

  async create(data: UserCreateInput): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new Error(`User with email '${data.email}' already exists`);
    }

    const userData = UserModel.create(data);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name, password_hash, salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userData.id,
      userData.email,
      userData.name,
      userData.passwordHash,
      userData.salt,
      now,
      now
    );

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(id: string, data: UserUpdateInput): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email.toLowerCase().trim());
    }
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name.trim());
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async count(): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
    const result = stmt.get() as { count: number };
    return result.count;
  }
}

// Singleton instance
export const userRepository = new UserRepository();
