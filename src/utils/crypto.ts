/**
 * Cryptographic utilities for password hashing
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Hash a password using SHA-256 with salt
 * In production, consider using bcrypt or argon2 for better security
 */
export function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

/**
 * Verify a password against a stored hash
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const hash = hashPassword(password, salt);
  return hash === storedHash;
}

/**
 * Generate a random salt
 */
export function generateSalt(length: number = 16): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}
