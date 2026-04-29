import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from './jwt.service.js';

describe('JWT Service', () => {
  const testUserId = 'test-user-id-123';
  const testEmail = 'test@example.com';
  const tokenVersion = 0;

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const tokens = generateTokens({
        userId: testUserId,
        email: testEmail,
        tokenVersion,
      });

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(15 * 60); // 15 minutes
      expect(tokens.tokenType).toBe('Bearer');
    });

    it('should generate a valid JWT access token', () => {
      const tokens = generateTokens({
        userId: testUserId,
        email: testEmail,
        tokenVersion,
      });

      const payload = verifyAccessToken(tokens.accessToken);
      expect(payload.userId).toBe(testUserId);
      expect(payload.email).toBe(testEmail);
    });

    it('should generate unique refresh tokens', () => {
      const tokens1 = generateTokens({
        userId: testUserId,
        email: testEmail,
        tokenVersion,
      });
      const tokens2 = generateTokens({
        userId: testUserId,
        email: testEmail,
        tokenVersion,
      });

      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const tokens = generateTokens({
        userId: testUserId,
        email: testEmail,
        tokenVersion,
      });

      const payload = verifyAccessToken(tokens.accessToken);
      expect(payload).toBeDefined();
      expect(payload.userId).toBe(testUserId);
      expect(payload.email).toBe(testEmail);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow('Invalid access token');
    });

    it('should throw error for tampered token', () => {
      const tokens = generateTokens({
        userId: testUserId,
        email: testEmail,
        tokenVersion,
      });

      const tamperedToken = tokens.accessToken.slice(0, -5) + 'xxxxx';
      expect(() => verifyAccessToken(tamperedToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const tokens = generateTokens({
        userId: testUserId,
        email: testEmail,
        tokenVersion,
      });

      const tokenData = verifyRefreshToken(tokens.refreshToken);
      expect(tokenData).toBeDefined();
      expect(tokenData.userId).toBe(testUserId);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid-refresh-token')).toThrow('Invalid refresh token');
    });

    it('should throw error for revoked token', () => {
      const tokens = generateTokens({
        userId: testUserId,
        email: testEmail,
        tokenVersion,
      });

      revokeRefreshToken(tokens.refreshToken);
      expect(() => verifyRefreshToken(tokens.refreshToken)).toThrow('Refresh token has been revoked');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a refresh token', () => {
      const tokens = generateTokens({
        userId: testUserId,
        email: testEmail,
        tokenVersion,
      });

      revokeRefreshToken(tokens.refreshToken);
      expect(() => verifyRefreshToken(tokens.refreshToken)).toThrow('Refresh token has been revoked');
    });
  });
});