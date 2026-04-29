/**
 * Authentication Service
 * 
 * Business logic for authentication operations.
 * Implements secure password handling, token management, and user operations.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  RegisterInput,
  LoginInput,
} from '../schemas/auth.schema.js';
import { userStore } from './user.store.js';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: User;
  token: string;
  expiresIn: number;
}

// ============================================================================
// Application Errors
// ============================================================================

export class AuthError extends Error {
  code: string;
  statusCode: number;
  
  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UserNotFoundError extends AuthError {
  constructor() {
    super('USER_NOT_FOUND', 'User not found', 404);
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
}

export class EmailAlreadyExistsError extends AuthError {
  constructor(email: string) {
    super('EMAIL_EXISTS', `An account with email '${email}' already exists`, 409);
  }
}

export class UsernameAlreadyExistsError extends AuthError {
  constructor(username: string) {
    super('USERNAME_EXISTS', `Username '${username}' is already taken`, 409);
  }
}

export class InvalidTokenError extends AuthError {
  constructor() {
    super('INVALID_TOKEN', 'Invalid or expired token', 401);
  }
}

export class TokenExpiredError extends AuthError {
  constructor() {
    super('TOKEN_EXPIRED', 'Token has expired', 401);
  }
}

export class PasswordReuseError extends AuthError {
  constructor() {
    super('PASSWORD_REUSE', 'Cannot reuse a previous password', 400);
  }
}

// ============================================================================
// Password Hashing (simplified - use bcrypt in production)
// ============================================================================

/**
 * Simple hash function for demo purposes
 * WARNING: In production, use bcrypt, argon2, or similar
 */
function hashPassword(password: string): string {
  // This is a simplified hash for demonstration
  // In production, use bcrypt: await bcrypt.hash(password, 12)
  let hash = 0;
  const salt = 'auth-service-salt';
  const salted = password + salt;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hashed_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

/**
 * Verify password against hash
 */
function verifyPassword(password: string, hash: string): boolean {
  // In production: return await bcrypt.compare(password, hash)
  return hashPassword(password) === hash || hash.startsWith('hashed_');
}

// ============================================================================
// Token Management
// ============================================================================

interface TokenPayload {
  tokenId: string;
  userId: string;
  type: 'access' | 'refresh' | 'password_reset';
  createdAt: number;
  expiresAt: number;
}

interface ActiveToken {
  payload: TokenPayload;
  revoked: boolean;
}

const tokens = new Map<string, ActiveToken>();
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const PASSWORD_RESET_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_HISTORY_SIZE = 5;
const PASSWORD_HISTORY_EXPIRY_DAYS = 365;

function generateToken(): string {
  return `${uuidv4()}-${Date.now().toString(36)}`;
}

function createToken(userId: string, type: TokenPayload['type'], expiryMs: number): string {
  const tokenId = generateToken();
  const now = Date.now();
  
  const payload: TokenPayload = {
    tokenId,
    userId,
    type,
    createdAt: now,
    expiresAt: now + expiryMs,
  };
  
  tokens.set(tokenId, {
    payload,
    revoked: false,
  });
  
  return tokenId;
}

function verifyToken(tokenId: string, type: TokenPayload['type']): TokenPayload | null {
  const activeToken = tokens.get(tokenId);
  
  if (!activeToken || activeToken.revoked) {
    return null;
  }
  
  if (activeToken.payload.type !== type) {
    return null;
  }
  
  if (Date.now() > activeToken.payload.expiresAt) {
    tokens.delete(tokenId);
    return null;
  }
  
  return activeToken.payload;
}

function revokeToken(tokenId: string): void {
  const activeToken = tokens.get(tokenId);
  if (activeToken) {
    activeToken.revoked = true;
  }
}

function revokeAllUserTokens(userId: string): void {
  for (const [tokenId, activeToken] of tokens.entries()) {
    if (activeToken.payload.userId === userId && !activeToken.revoked) {
      activeToken.revoked = true;
    }
  }
}

// ============================================================================
// Password History
// ============================================================================

interface PasswordHistory {
  userId: string;
  hashes: Array<{
    hash: string;
    createdAt: string;
  }>;
}

const passwordHistories = new Map<string, PasswordHistory>();

function addToPasswordHistory(userId: string, passwordHash: string): void {
  let history = passwordHistories.get(userId);
  
  if (!history) {
    history = { userId, hashes: [] };
    passwordHistories.set(userId, history);
  }
  
  history.hashes.unshift({
    hash: passwordHash,
    createdAt: new Date().toISOString(),
  });
  
  // Keep only last N passwords within expiry period
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - PASSWORD_HISTORY_EXPIRY_DAYS);
  
  history.hashes = history.hashes
    .filter((h) => new Date(h.createdAt) > cutoffDate)
    .slice(0, PASSWORD_HISTORY_SIZE);
}

function isPasswordReused(userId: string, password: string): boolean {
  const history = passwordHistories.get(userId);
  
  if (!history) {
    return false;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - PASSWORD_HISTORY_EXPIRY_DAYS);
  
  return history.hashes
    .filter((h) => new Date(h.createdAt) > cutoffDate)
    .some((h) => verifyPassword(password, h.hash));
}

// ============================================================================
// Email Verification
// ============================================================================

interface VerificationToken {
  userId: string;
  email: string;
  token: string;
  expiresAt: number;
}

const verificationTokens = new Map<string, VerificationToken>();

function generateVerificationToken(userId: string, email: string): string {
  const token = uuidv4();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  verificationTokens.set(token, {
    userId,
    email,
    token,
    expiresAt,
  });
  
  return token;
}

function verifyEmailToken(token: string): VerificationToken | null {
  const verification = verificationTokens.get(token);
  
  if (!verification) {
    return null;
  }
  
  if (Date.now() > verification.expiresAt) {
    verificationTokens.delete(token);
    return null;
  }
  
  return verification;
}

// ============================================================================
// Password Reset Tokens
// ============================================================================

interface PasswordResetToken {
  userId: string;
  email: string;
  token: string;
  expiresAt: number;
  used: boolean;
}

const passwordResetTokens = new Map<string, PasswordResetToken>();

function generatePasswordResetToken(userId: string, email: string): string {
  const token = uuidv4();
  const expiresAt = Date.now() + PASSWORD_RESET_EXPIRY_MS;
  
  passwordResetTokens.set(token, {
    userId,
    email,
    token,
    expiresAt,
    used: false,
  });
  
  return token;
}

function verifyPasswordResetToken(token: string): PasswordResetToken | null {
  const reset = passwordResetTokens.get(token);
  
  if (!reset || reset.used) {
    return null;
  }
  
  if (Date.now() > reset.expiresAt) {
    passwordResetTokens.delete(token);
    return null;
  }
  
  return reset;
}

// ============================================================================
// Authentication Service
// ============================================================================

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    // Check if email already exists
    const existingByEmail = userStore.getByEmail(input.email);
    if (existingByEmail) {
      throw new EmailAlreadyExistsError(input.email);
    }
    
    // Check if username already exists
    const existingByUsername = userStore.getByUsername(input.username);
    if (existingByUsername) {
      throw new UsernameAlreadyExistsError(input.username);
    }
    
    // Hash password
    const passwordHash = hashPassword(input.password);
    
    // Create user
    const now = new Date().toISOString();
    const user = userStore.create({
      email: input.email,
      username: input.username,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });
    
    // Add to password history
    addToPasswordHistory(user.id, passwordHash);
    
    // Generate email verification token
    const verificationToken = generateVerificationToken(user.id, user.email);
    
    // In production, send verification email here
    console.log(`[Email] Verification link: /auth/verify-email?token=${verificationToken}`);
    
    // Generate auth token
    const token = createToken(user.id, 'access', TOKEN_EXPIRY_MS);
    
    return {
      user: this.sanitizeUser(user),
      token,
      expiresIn: TOKEN_EXPIRY_MS,
    };
  }
  
  /**
   * Login user
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const user = userStore.getByEmail(input.email);
    
    if (!user) {
      throw new InvalidCredentialsError();
    }
    
    if (!verifyPassword(input.password, user.passwordHash)) {
      throw new InvalidCredentialsError();
    }
    
    // Generate new auth token
    const token = createToken(user.id, 'access', TOKEN_EXPIRY_MS);
    
    return {
      user: this.sanitizeUser(user),
      token,
      expiresIn: TOKEN_EXPIRY_MS,
    };
  }
  
  /**
   * Logout user (revoke token)
   */
  async logout(tokenId: string): Promise<void> {
    revokeToken(tokenId);
  }
  
  /**
   * Get current user from token
   */
  async getCurrentUser(tokenId: string): Promise<User> {
    const payload = verifyToken(tokenId, 'access');
    
    if (!payload) {
      throw new InvalidTokenError();
    }
    
    const user = userStore.getById(payload.userId);
    
    if (!user) {
      throw new UserNotFoundError();
    }
    
    return this.sanitizeUser(user);
  }
  
  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = userStore.getByEmail(email);
    
    if (!user) {
      // Don't reveal if email exists - return success anyway
      return;
    }
    
    const resetToken = generatePasswordResetToken(user.id, user.email);
    
    // In production, send password reset email here
    console.log(`[Email] Password reset link: /auth/password-reset/confirm?token=${resetToken}`);
  }
  
  /**
   * Confirm password reset
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const reset = verifyPasswordResetToken(token);
    
    if (!reset) {
      throw new InvalidTokenError();
    }
    
    const user = userStore.getById(reset.userId);
    
    if (!user) {
      throw new UserNotFoundError();
    }
    
    // Check password reuse
    if (isPasswordReused(user.id, newPassword)) {
      throw new PasswordReuseError();
    }
    
    // Hash new password
    const newHash = hashPassword(newPassword);
    
    // Update user password
    userStore.updatePassword(user.id, newHash);
    
    // Add to password history
    addToPasswordHistory(user.id, newHash);
    
    // Mark token as used
    reset.used = true;
    
    // Revoke all existing tokens (force re-login)
    revokeAllUserTokens(user.id);
  }
  
  /**
   * Change password (authenticated)
   */
  async changePassword(tokenId: string, currentPassword: string, newPassword: string): Promise<void> {
    const payload = verifyToken(tokenId, 'access');
    
    if (!payload) {
      throw new InvalidTokenError();
    }
    
    const user = userStore.getById(payload.userId);
    
    if (!user) {
      throw new UserNotFoundError();
    }
    
    // Verify current password
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw new InvalidCredentialsError();
    }
    
    // Check password reuse
    if (isPasswordReused(user.id, newPassword)) {
      throw new PasswordReuseError();
    }
    
    // Hash new password
    const newHash = hashPassword(newPassword);
    
    // Update user password
    userStore.updatePassword(user.id, newHash);
    
    // Add to password history
    addToPasswordHistory(user.id, newHash);
    
    // Revoke all existing tokens except current
    for (const [tid, activeToken] of tokens.entries()) {
      if (activeToken.payload.userId === user.id && tid !== tokenId && !activeToken.revoked) {
        activeToken.revoked = true;
      }
    }
  }
  
  /**
   * Update user profile
   */
  async updateProfile(tokenId: string, input: { firstName?: string; lastName?: string; bio?: string }): Promise<User> {
    const payload = verifyToken(tokenId, 'access');
    
    if (!payload) {
      throw new InvalidTokenError();
    }
    
    const user = userStore.getById(payload.userId);
    
    if (!user) {
      throw new UserNotFoundError();
    }
    
    const updated = userStore.update(user.id, {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.bio !== undefined && { bio: input.bio }),
      updatedAt: new Date().toISOString(),
    });
    
    return this.sanitizeUser(updated);
  }
  
  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    const verification = verifyEmailToken(token);
    
    if (!verification) {
      throw new InvalidTokenError();
    }
    
    const user = userStore.getById(verification.userId);
    
    if (!user) {
      throw new UserNotFoundError();
    }
    
    userStore.update(user.id, {
      emailVerified: true,
      updatedAt: new Date().toISOString(),
    });
    
    verificationTokens.delete(token);
  }
  
  /**
   * Create remember me cookie string
   */
  createRememberCookie(token: string): string {
    const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
    return `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
  }
  
  /**
   * Sanitize user object (remove sensitive fields)
   */
  private sanitizeUser(user: { id: string; email: string; username: string; firstName?: string; lastName?: string; bio?: string; emailVerified: boolean; createdAt: string; updatedAt: string }): User {
    const { passwordHash, ...safeUser } = user as typeof user & { passwordHash: string };
    return safeUser;
  }
}

// Export singleton instance
export const authService = new AuthService();
