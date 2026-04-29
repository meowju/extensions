/**
 * AuthToken repository
 * Handles all database operations for authentication tokens
 */

import { getDatabase } from '../index.js';
import { AuthTokenModel, type AuthToken } from '../models/auth-token.model.js';

export interface IAuthTokenRepository {
  findByToken(token: string): Promise<AuthToken | null>;
  findByUserId(userId: string): Promise<AuthToken[]>;
  create(userId: string, expiresInHours?: number): Promise<AuthToken>;
  delete(token: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  deleteExpired(): Promise<number>;
  isValid(token: string): Promise<boolean>;
}

export class AuthTokenRepository implements IAuthTokenRepository {
  private get db() {
    return getDatabase();
  }

  async findByToken(token: string): Promise<AuthToken | null> {
    const stmt = this.db.prepare(`
      SELECT token, user_id, expires_at, created_at
      FROM auth_tokens
      WHERE token = ?
    `);
    const row = stmt.get(token) as {
      token: string;
      user_id: string;
      expires_at: string;
      created_at: string;
    } | undefined;
    return row ? AuthTokenModel.toEntity(row) : null;
  }

  async findByUserId(userId: string): Promise<AuthToken[]> {
    const stmt = this.db.prepare(`
      SELECT token, user_id, expires_at, created_at
      FROM auth_tokens
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId) as Array<{
      token: string;
      user_id: string;
      expires_at: string;
      created_at: string;
    }>;
    return rows.map(row => AuthTokenModel.toEntity(row));
  }

  async create(userId: string, expiresInHours: number = 24): Promise<AuthToken> {
    const tokenData = AuthTokenModel.create(userId, expiresInHours);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO auth_tokens (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(tokenData.token, tokenData.userId, tokenData.expiresAt, now);

    return {
      token: tokenData.token,
      userId: tokenData.userId,
      expiresAt: tokenData.expiresAt,
      createdAt: now,
    };
  }

  async delete(token: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM auth_tokens WHERE token = ?');
    const result = stmt.run(token);
    return result.changes > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const stmt = this.db.prepare('DELETE FROM auth_tokens WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes;
  }

  async deleteExpired(): Promise<number> {
    const stmt = this.db.prepare(`
      DELETE FROM auth_tokens 
      WHERE expires_at < datetime('now')
    `);
    const result = stmt.run();
    return result.changes;
  }

  async isValid(token: string): Promise<boolean> {
    const authToken = await this.findByToken(token);
    if (!authToken) return false;
    return !AuthTokenModel.isExpired(authToken.expiresAt);
  }
}

// Singleton instance
export const authTokenRepository = new AuthTokenRepository();
