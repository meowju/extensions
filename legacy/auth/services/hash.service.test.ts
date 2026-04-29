import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hashPassword, verifyPassword, generateSecureToken } from './hash.service.js';

describe('Hash Service', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2); // Salt makes each hash unique
    });

    it('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password cannot be empty');
    });

    it('should handle whitespace-only password (bcrypt behavior)', async () => {
      // bcrypt does not reject whitespace-only passwords
      // This is expected behavior - validation should be done at the Zod schema level
      const hash = await hashPassword('   ');
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(50);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      const result = await verifyPassword('WrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword('TestPassword123');
      
      const result = await verifyPassword('', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const result = await verifyPassword('password', '');
      expect(result).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a token with default length', () => {
      const token = generateSecureToken();
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate a token with custom length', () => {
      const token = generateSecureToken(16);
      expect(token).toBeDefined();
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it('should only contain hex characters', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });
});