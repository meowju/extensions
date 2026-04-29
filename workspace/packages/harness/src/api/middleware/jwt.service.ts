/**
 * JWT Service - Handles JSON Web Token operations
 * Creates, verifies, and refreshes JWT tokens using RS256 or HS256
 */

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import {
  type JwtPayload,
  type TokenPair,
  type JwtConfig,
  type AuthenticatedUser,
  UserRole,
} from './auth.types.js';

/**
 * Default JWT configuration
 */
const DEFAULT_CONFIG: JwtConfig = {
  secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  expiresIn: '15m',           // Short-lived access tokens
  refreshExpiresIn: '7d',      // Longer-lived refresh tokens
  issuer: 'api-service',
  audience: 'api-client',
};

// ============================================
// Token Revocation Store
// ============================================

/**
 * In-memory store for revoked tokens
 * In production, use Redis with TTL for better performance
 */
class TokenBlacklist {
  private revokedTokens: Map<string, number> = new Map();
  private refreshTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();

  /**
   * Check if a token has been revoked
   */
  isRevoked(token: string): boolean {
    const expiry = this.revokedTokens.get(token);
    if (expiry === undefined) return false;
    
    // Clean up expired entries
    if (Date.now() > expiry) {
      this.revokedTokens.delete(token);
      return false;
    }
    
    return true;
  }

  /**
   * Revoke a token with optional TTL
   */
  revoke(token: string, ttlMs?: number): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : Date.now() + 7 * 24 * 60 * 60 * 1000;
    this.revokedTokens.set(token, expiresAt);
  }

  /**
   * Store a refresh token
   */
  storeRefreshToken(token: string, userId: string, expiresAt: Date): void {
    this.refreshTokens.set(token, { userId, expiresAt });
  }

  /**
   * Verify and consume a refresh token (single use)
   */
  consumeRefreshToken(token: string): { userId: string } | null {
    const data = this.refreshTokens.get(token);
    if (!data) return null;
    
    if (data.expiresAt < new Date()) {
      this.refreshTokens.delete(token);
      return null;
    }
    
    // Remove the token (single use)
    this.refreshTokens.delete(token);
    return { userId: data.userId };
  }

  /**
   * Revoke all refresh tokens for a user
   */
  revokeAllUserTokens(userId: string): void {
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.userId === userId) {
        this.refreshTokens.delete(token);
      }
    }
  }

  /**
   * Clear all revoked tokens
   */
  clear(): void {
    this.revokedTokens.clear();
    this.refreshTokens.clear();
  }
}

// ============================================
// JWT Service
// ============================================

export class JwtService {
  private config: JwtConfig;
  private blacklist: TokenBlacklist;

  constructor(config: Partial<JwtConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.blacklist = new TokenBlacklist();
  }

  /**
   * Generate a new access token
   */
  generateAccessToken(user: AuthenticatedUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: 0, // Will be set by jwt.sign
    };

    return jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.expiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience,
    });
  }

  /**
   * Generate a new refresh token
   */
  generateRefreshToken(userId: string): string {
    const payload = {
      sub: userId,
      type: 'refresh',
      jti: randomBytes(16).toString('hex'), // Unique token ID
    };

    return jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.refreshExpiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience,
    });
  }

  /**
   * Generate a token pair (access + refresh)
   */
  generateTokenPair(user: AuthenticatedUser): TokenPair {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    this.blacklist.storeRefreshToken(refreshToken, user.id, expiresAt);

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      // Check blacklist first
      if (this.blacklist.isRevoked(token)) {
        return null;
      }

      const decoded = jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return null;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return null;
      }
      return null;
    }
  }

  /**
   * Refresh tokens using a refresh token
   */
  refreshTokens(refreshToken: string, user: AuthenticatedUser): TokenPair | null {
    try {
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as { sub: string; type: string };

      if (decoded.type !== 'refresh') {
        return null;
      }

      // Consume the refresh token (single use)
      const tokenData = this.blacklist.consumeRefreshToken(refreshToken);
      if (!tokenData) {
        return null;
      }

      // Generate new token pair
      return this.generateTokenPair(user);
    } catch {
      return null;
    }
  }

  /**
   * Revoke a specific token
   */
  revokeToken(token: string): void {
    this.blacklist.revoke(token);
  }

  /**
   * Revoke all tokens for a user (logout everywhere)
   */
  revokeAllUserTokens(userId: string): void {
    this.blacklist.revokeAllUserTokens(userId);
  }

  /**
   * Decode a token without verification (for logging/debugging)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Get time until token expiration
   */
  getTokenExpiry(token: string): number | null {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;
    return expiresIn > 0 ? expiresIn : null;
  }
}

// Export singleton instance
export const jwtService = new JwtService();

// Export for testing
export { TokenBlacklist };