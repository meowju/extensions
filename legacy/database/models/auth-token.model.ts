/**
 * AuthToken entity model
 * Defines the database schema and entity type for authentication tokens
 */

import { randomBytes } from 'crypto';

// Domain types
export interface AuthToken {
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

// Database row type (raw from SQLite)
export interface AuthTokenRow {
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export class AuthTokenModel {
  /**
   * Generate a new secure token
   */
  static generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Convert database row to AuthToken entity
   */
  static toEntity(row: AuthTokenRow): AuthToken {
    return {
      token: row.token,
      userId: row.user_id,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  /**
   * Create a new auth token record
   */
  static create(userId: string, expiresInHours: number = 24): {
    token: string;
    userId: string;
    expiresAt: string;
  } {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    return {
      token,
      userId,
      expiresAt,
    };
  }

  /**
   * Check if a token is expired
   */
  static isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }
}

export { AuthTokenModel as default };
