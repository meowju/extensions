/**
 * User entity model
 * Defines the database schema and entity type for users
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';
import { hashPassword, verifyPassword as cryptoVerifyPassword } from '../../utils/crypto.js';

// Validation schemas
export const UserCreateSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const UserUpdateSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;

// Domain types (what we expose to the API)
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithPassword {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// Database row type (raw from SQLite)
export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  salt: string;
  created_at: string;
  updated_at: string;
}

export class UserModel {
  /**
   * Convert database row to User entity (without sensitive fields)
   */
  static toEntity(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert database row to public user (what we expose)
   */
  static toPublic(row: UserRow): UserPublic {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
    };
  }

  /**
   * Convert database row to user with password (for internal use)
   */
  static toWithPassword(row: UserRow): UserWithPassword {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      salt: row.salt,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Create a new user record from input
   */
  static create(data: UserCreateInput): {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    salt: string;
  } {
    const id = randomUUID();
    const salt = randomUUID().replace(/-/g, '').slice(0, 32);
    const passwordHash = hashPassword(data.password, salt);

    return {
      id,
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      passwordHash,
      salt,
    };
  }

  /**
   * Verify a password against stored hash
   */
  static verifyPassword(plainPassword: string, storedHash: string, salt: string): boolean {
    return cryptoVerifyPassword(plainPassword, storedHash, salt);
  }
}

export { UserModel as default };
