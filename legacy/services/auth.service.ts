import { PrismaClient, AuthToken, RefreshToken, TokenType } from '@prisma/client';
import { prisma } from '../config/database';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { TokenPayload, RefreshTokenPayload, AuthTokens } from '../types';

export class AuthService {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = prisma;
  }
  
  /**
   * Generate access token
   */
  private generateAccessToken(userId: string, email: string, role: string): string {
    const payload: TokenPayload = { userId, email, role, type: 'access' };
    
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }
  
  /**
   * Generate refresh token
   */
  private generateRefreshToken(userId: string, email: string, role: string, familyId: string): string {
    const payload: RefreshTokenPayload = { userId, email, role, type: 'refresh', familyId };
    
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }
  
  /**
   * Verify token
   */
  verifyToken(token: string): TokenPayload | RefreshTokenPayload | null {
    try {
      return jwt.verify(token, config.jwt.secret) as TokenPayload | RefreshTokenPayload;
    } catch {
      return null;
    }
  }
  
  /**
   * Generate both access and refresh tokens
   */
  async generateTokens(
    userId: string,
    email: string,
    role: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    const familyId = uuidv4();
    
    const accessToken = this.generateAccessToken(userId, email, role);
    const refreshToken = this.generateRefreshToken(userId, email, role, familyId);
    
    // Calculate expiration
    const accessExpiresAt = new Date();
    accessExpiresAt.setDate(accessExpiresAt.getDate() + 7); // 7 days
    
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30); // 30 days
    
    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: refreshExpiresAt,
        ipAddress,
        userAgent,
        familyId,
      },
    });
    
    // Store auth token for tracking/revocation
    await this.prisma.authToken.create({
      data: {
        token: accessToken,
        type: TokenType.ACCESS,
        userId,
        expiresAt: accessExpiresAt,
        ipAddress,
        userAgent,
      },
    });
    
    return { accessToken, refreshToken };
  }
  
  /**
   * Refresh tokens (with rotation for security)
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens | null> {
    // Verify the token
    const payload = this.verifyToken(refreshToken) as RefreshTokenPayload | null;
    
    if (!payload || payload.type !== 'refresh') {
      return null;
    }
    
    // Find the token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    
    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      // Token is invalid, revoked, or expired
      // Check if this is part of a token rotation attack
      await this.revokeTokenFamily(payload.userId, payload.familyId);
      return null;
    }
    
    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user || !user.isActive) {
      return null;
    }
    
    // Revoke old refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });
    
    // Generate new tokens
    return this.generateTokens(user.id, user.email, user.role, ipAddress, userAgent);
  }
  
  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await Promise.all([
      this.prisma.authToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      }),
    ]);
  }
  
  /**
   * Revoke a specific token
   */
  async revokeToken(token: string): Promise<boolean> {
    const payload = this.verifyToken(token);
    
    if (!payload) return false;
    
    if (payload.type === 'access') {
      await this.prisma.authToken.updateMany({
        where: { token },
        data: { isRevoked: true },
      });
    } else {
      await this.prisma.refreshToken.update({
        where: { token },
        data: { isRevoked: true },
      });
    }
    
    return true;
  }
  
  /**
   * Revoke token family (for rotation attack detection)
   */
  async revokeTokenFamily(userId: string, familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, familyId },
      data: { isRevoked: true },
    });
  }
  
  /**
   * Clean up expired tokens (background job)
   */
  async cleanupExpiredTokens(): Promise<{ deletedAuthTokens: number; deletedRefreshTokens: number }> {
    const now = new Date();
    
    const [authResult, refreshResult] = await Promise.all([
      this.prisma.authToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { isRevoked: true },
          ],
        },
      }),
      this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { isRevoked: true },
          ],
        },
      }),
    ]);
    
    return {
      deletedAuthTokens: authResult.count,
      deletedRefreshTokens: refreshResult.count,
    };
  }
  
  /**
   * Create verification token
   */
  async createVerificationToken(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours
    
    await this.prisma.authToken.create({
      data: {
        token,
        type: TokenType.VERIFICATION,
        userId,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });
    
    return token;
  }
  
  /**
   * Verify verification token
   */
  async verifyVerificationToken(token: string): Promise<string | null> {
    const storedToken = await this.prisma.authToken.findUnique({
      where: { token },
      include: { user: true },
    });
    
    if (!storedToken || storedToken.type !== TokenType.VERIFICATION) {
      return null;
    }
    
    if (storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      return null;
    }
    
    // Revoke after use
    await this.prisma.authToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });
    
    return storedToken.userId;
  }
  
  /**
   * Create password reset token
   */
  async createPasswordResetToken(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour
    
    await this.prisma.authToken.create({
      data: {
        token,
        type: TokenType.PASSWORD_RESET,
        userId,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });
    
    return token;
  }
  
  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(token: string): Promise<string | null> {
    const storedToken = await this.prisma.authToken.findUnique({
      where: { token },
    });
    
    if (!storedToken || storedToken.type !== TokenType.PASSWORD_RESET) {
      return null;
    }
    
    if (storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      return null;
    }
    
    return storedToken.userId;
  }
}

export const authService = new AuthService();