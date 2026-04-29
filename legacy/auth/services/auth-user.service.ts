/**
 * Auth User Service - In-memory user store for authentication
 * 
 * This service provides user management functions for authentication.
 * It uses an in-memory store for testing/development.
 * For production, replace with MongoDB integration using User model.
 */

import bcrypt from 'bcrypt';
import { generateSecureToken } from './hash.service.js';

// In-memory user store
interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

interface UserPublic {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

const userStore = new Map<string, StoredUser>();
const userEmailIndex = new Map<string, string>(); // email -> userId
const userTokenVersions = new Map<string, number>(); // userId -> version

// Bcrypt salt rounds
const SALT_ROUNDS = 12;

/**
 * Generate unique ID
 */
function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ user: Omit<StoredUser, 'passwordHash'> & { passwordHash?: undefined }; tokenVersion: number }> {
  const normalizedEmail = data.email.toLowerCase().trim();
  
  // Check if email already exists
  if (userEmailIndex.has(normalizedEmail)) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  
  const now = new Date();
  const user: StoredUser = {
    id: generateId(),
    email: normalizedEmail,
    passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    createdAt: now,
    updatedAt: now,
  };

  // Store user
  userStore.set(user.id, user);
  userEmailIndex.set(normalizedEmail, user.id);
  userTokenVersions.set(user.id, 0);

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword as Omit<StoredUser, 'passwordHash'> & { passwordHash?: undefined },
    tokenVersion: 0,
  };
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(credentials: {
  email: string;
  password: string;
}): Promise<Omit<StoredUser, 'passwordHash'> & { passwordHash?: undefined } | null> {
  const userId = userEmailIndex.get(credentials.email.toLowerCase().trim());
  
  if (!userId) {
    return null;
  }

  const user = userStore.get(userId);
  
  if (!user) {
    return null;
  }

  // Verify password
  const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
  
  if (!isValid) {
    return null;
  }

  // Update last login time
  user.lastLoginAt = new Date();
  user.updatedAt = new Date();

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword as Omit<StoredUser, 'passwordHash'> & { passwordHash?: undefined };
}

/**
 * Find user by ID
 */
export function findUserById(userId: string): Omit<StoredUser, 'passwordHash'> & { passwordHash?: undefined } | null {
  const user = userStore.get(userId);
  
  if (!user) {
    return null;
  }

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword as Omit<StoredUser, 'passwordHash'> & { passwordHash?: undefined };
}

/**
 * Find user by email
 */
export function findUserByEmail(email: string): Omit<StoredUser, 'passwordHash'> & { passwordHash?: undefined } | null {
  const userId = userEmailIndex.get(email.toLowerCase().trim());
  
  if (!userId) {
    return null;
  }

  return findUserById(userId);
}

/**
 * Check if email is taken
 */
export function isEmailTaken(email: string): boolean {
  return userEmailIndex.has(email.toLowerCase().trim());
}

/**
 * Delete user by ID
 */
export function deleteUser(userId: string): boolean {
  const user = userStore.get(userId);
  
  if (!user) {
    return false;
  }

  userStore.delete(userId);
  userEmailIndex.delete(user.email);
  userTokenVersions.delete(userId);

  return true;
}

/**
 * Get token version for user
 */
export function getTokenVersion(userId: string): number {
  return userTokenVersions.get(userId) ?? 0;
}

/**
 * Increment token version for user (for logout-all)
 */
export function incrementTokenVersion(userId: string): number {
  const current = getTokenVersion(userId);
  const next = current + 1;
  userTokenVersions.set(userId, next);
  return next;
}

/**
 * Clear all users (for testing)
 */
export function clearUserStore(): void {
  userStore.clear();
  userEmailIndex.clear();
  userTokenVersions.clear();
}

/**
 * Get all users (for testing)
 */
export function getAllUsers(): StoredUser[] {
  return Array.from(userStore.values());
}

// Export the store for testing
export const userServiceStore = {
  users: userStore,
  usersByEmail: userEmailIndex,
  userTokenVersions,
};

export default {
  createUser,
  authenticateUser,
  findUserById,
  findUserByEmail,
  isEmailTaken,
  deleteUser,
  getTokenVersion,
  incrementTokenVersion,
  clearUserStore,
  getAllUsers,
  userServiceStore,
};