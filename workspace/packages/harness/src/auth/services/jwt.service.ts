import jwt from 'jsonwebtoken';
import type {
  TokenPayload,
  RefreshTokenPayload,
  AuthTokens,
  UserPublic,
} from '../types/auth.types.js';
import { generateSecureToken } from './hash.service.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Token expiration times (in seconds)
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes (OWASP recommended short expiry)
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

// Store for revoked refresh tokens (in production, use Redis)
const revokedRefreshTokens = new Set<string>();

export interface JWTServiceDeps {
  userId: string;
  email: string;
  tokenVersion?: number;
}

/**
 * Generate access and refresh token pair
 */
export function generateTokens(
  deps: JWTServiceDeps
): AuthTokens {
  const accessToken = generateAccessToken({
    userId: deps.userId,
    email: deps.email,
  });

  const refreshToken = generateRefreshToken({
    userId: deps.userId,
    tokenVersion: deps.tokenVersion || 0,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
    tokenType: 'Bearer',
  };
}

/**
 * Generate access token (JWT with short expiry)
 */
function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
}

/**
 * Generate refresh token (opaque token stored server-side)
 */
function generateRefreshToken(payload: RefreshTokenPayload): string {
  // Use a secure random token as the refresh token
  const opaqueToken = generateSecureToken(32);
  
  // Store the token metadata in memory (in production, store in Redis)
  // Map opaque token to payload for validation
  refreshTokenStore.set(opaqueToken, {
    userId: payload.userId,
    tokenVersion: payload.tokenVersion,
    expiresAt: Date.now() + REFRESH_TOKEN_EXPIRY * 1000,
  });

  return opaqueToken;
}

// In-memory refresh token store (replace with Redis in production)
const refreshTokenStore = new Map<
  string,
  {
    userId: string;
    tokenVersion: number;
    expiresAt: number;
  }
>();

/**
 * Verify access token and return payload
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as TokenPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(
  token: string
): { userId: string; tokenVersion: number } {
  // Check if token is revoked
  if (revokedRefreshTokens.has(token)) {
    throw new Error('Refresh token has been revoked');
  }

  const tokenData = refreshTokenStore.get(token);
  if (!tokenData) {
    throw new Error('Invalid refresh token');
  }

  if (tokenData.expiresAt < Date.now()) {
    refreshTokenStore.delete(token);
    throw new Error('Refresh token has expired');
  }

  return {
    userId: tokenData.userId,
    tokenVersion: tokenData.tokenVersion,
  };
}

/**
 * Revoke a refresh token (logout)
 */
export function revokeRefreshToken(token: string): void {
  refreshTokenStore.delete(token);
  revokedRefreshTokens.add(token);
}

/**
 * Revoke all refresh tokens for a user
 */
export function revokeAllUserTokens(userId: string): void {
  for (const [token, data] of refreshTokenStore.entries()) {
    if (data.userId === userId) {
      refreshTokenStore.delete(token);
    }
  }
}

/**
 * Get token payload without verification (for debugging)
 */
export function decodeAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}