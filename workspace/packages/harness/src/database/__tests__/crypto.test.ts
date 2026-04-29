/**
 * Crypto utilities unit tests
 */

import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateSalt, generateToken } from '../../utils/crypto.js';

describe('Crypto Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', () => {
      const password = 'testpassword123';
      const salt = 'testsalt';

      const hash = hashPassword(password, salt);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should produce consistent hashes for same input', () => {
      const password = 'testpassword123';
      const salt = 'testsalt';

      const hash1 = hashPassword(password, salt);
      const hash2 = hashPassword(password, salt);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different passwords', () => {
      const salt = 'testsalt';

      const hash1 = hashPassword('password1', salt);
      const hash2 = hashPassword('password2', salt);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different salts', () => {
      const password = 'testpassword123';

      const hash1 = hashPassword(password, 'salt1');
      const hash2 = hashPassword(password, 'salt2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const password = 'testpassword123';
      const salt = 'testsalt';
      const hash = hashPassword(password, salt);

      const isValid = verifyPassword(password, hash, salt);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', () => {
      const password = 'testpassword123';
      const salt = 'testsalt';
      const hash = hashPassword(password, salt);

      const isValid = verifyPassword('wrongpassword', hash, salt);

      expect(isValid).toBe(false);
    });
  });

  describe('generateSalt', () => {
    it('should generate salt of default length', () => {
      const salt = generateSalt();

      expect(salt.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate salt of custom length', () => {
      const salt = generateSalt(32);

      expect(salt.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      expect(salt1).not.toBe(salt2);
    });
  });

  describe('generateToken', () => {
    it('should generate token of default length', () => {
      const token = generateToken();

      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate token of custom length', () => {
      const token = generateToken(16);

      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(token1).not.toBe(token2);
    });
  });
});
