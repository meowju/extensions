import bcrypt from 'bcryptjs';
import type { User } from '../types/auth.types.js';

// Bcrypt configuration
const BCRYPT_SALT_ROUNDS = 12; // OWASP recommended for password hashing

/**
 * Hash a password using bcrypt with secure salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify a password against a stored hash using bcrypt
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a secure random token (for refresh tokens, etc.)
 * Uses crypto module for secure random generation
 */
export function generateSecureToken(byteLength: number = 32): string {
  const buffer = new Uint8Array(byteLength);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}