/**
 * AuthToken model unit tests
 */

import { describe, it, expect } from 'vitest';
import { AuthTokenModel } from '../models/auth-token.model.js';

describe('AuthTokenModel', () => {
  describe('generateToken', () => {
    it('should generate a token of correct length', () => {
      const token = AuthTokenModel.generateToken();

      // 32 bytes = 64 hex characters
      expect(token.length).toBe(64);
    });

    it('should generate unique tokens', () => {
      const token1 = AuthTokenModel.generateToken();
      const token2 = AuthTokenModel.generateToken();

      expect(token1).not.toBe(token2);
    });

    it('should only contain hex characters', () => {
      const token = AuthTokenModel.generateToken();

      expect(/^[0-9a-f]+$/i.test(token)).toBe(true);
    });
  });

  describe('create', () => {
    it('should create a token with user ID', () => {
      const result = AuthTokenModel.create('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.token).toHaveLength(64);
    });

    it('should set expiresAt based on hours', () => {
      const before = Date.now();
      const result = AuthTokenModel.create('user-123', 24);
      const after = Date.now();

      const expiresAt = new Date(result.expiresAt).getTime();
      
      // 24 hours from now (with some tolerance)
      const expectedMin = before + 24 * 60 * 60 * 1000;
      const expectedMax = after + 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it('should use default 24 hours if not specified', () => {
      const before = Date.now();
      const result = AuthTokenModel.create('user-123');
      const after = Date.now();

      const expiresAt = new Date(result.expiresAt).getTime();
      const expectedMin = before + 24 * 60 * 60 * 1000;
      const expectedMax = after + 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('toEntity', () => {
    it('should convert database row to entity', () => {
      const row = {
        token: 'abc123',
        user_id: 'user-456',
        expires_at: '2024-01-01T12:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      const result = AuthTokenModel.toEntity(row);

      expect(result).toEqual({
        token: 'abc123',
        userId: 'user-456',
        expiresAt: '2024-01-01T12:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
    });
  });

  describe('isExpired', () => {
    it('should return true for expired token', () => {
      const expired = new Date(Date.now() - 1000).toISOString();

      expect(AuthTokenModel.isExpired(expired)).toBe(true);
    });

    it('should return false for valid token', () => {
      const valid = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      expect(AuthTokenModel.isExpired(valid)).toBe(false);
    });
  });
});
