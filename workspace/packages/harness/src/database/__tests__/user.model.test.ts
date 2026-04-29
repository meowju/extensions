/**
 * User model unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UserModel, UserCreateSchema, UserUpdateSchema } from '../models/user.model.js';

describe('UserModel', () => {
  describe('create', () => {
    it('should create a new user with hashed password', () => {
      const input = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'securepassword123',
      };

      const result = UserModel.create(input);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result).toHaveProperty('passwordHash');
      expect(result).toHaveProperty('salt');
      expect(result.passwordHash).not.toBe('securepassword123');
    });

    it('should lowercase and trim email', () => {
      const input = {
        email: '  TEST@EXAMPLE.COM  ',
        name: 'Test User',
        password: 'securepassword123',
      };

      const result = UserModel.create(input);

      expect(result.email).toBe('test@example.com');
    });

    it('should trim name', () => {
      const input = {
        email: 'test@example.com',
        name: '  Test User  ',
        password: 'securepassword123',
      };

      const result = UserModel.create(input);

      expect(result.name).toBe('Test User');
    });

    it('should generate unique IDs', () => {
      const input = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'securepassword123',
      };

      const result1 = UserModel.create(input);
      const result2 = UserModel.create({ ...input, email: 'test2@example.com' });

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const input = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'securepassword123',
      };

      const user = UserModel.create(input);

      const isValid = UserModel.verifyPassword(
        'securepassword123',
        user.passwordHash,
        user.salt
      );

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', () => {
      const input = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'securepassword123',
      };

      const user = UserModel.create(input);

      const isValid = UserModel.verifyPassword(
        'wrongpassword',
        user.passwordHash,
        user.salt
      );

      expect(isValid).toBe(false);
    });
  });

  describe('toEntity', () => {
    it('should convert database row to entity', () => {
      const row = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hash',
        salt: 'salt',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = UserModel.toEntity(row);

      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });
  });

  describe('toPublic', () => {
    it('should convert database row to public user', () => {
      const row = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hash',
        salt: 'salt',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = UserModel.toPublic(row);

      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('salt');
    });
  });
});

describe('UserCreateSchema', () => {
  it('should validate valid input', () => {
    const input = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'securepassword123',
    };

    const result = UserCreateSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const input = {
      email: 'invalid-email',
      name: 'Test User',
      password: 'securepassword123',
    };

    const result = UserCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject short password', () => {
    const input = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'short',
    };

    const result = UserCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const input = {
      email: 'test@example.com',
      name: '',
      password: 'securepassword123',
    };

    const result = UserCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
  });
});

describe('UserUpdateSchema', () => {
  it('should validate partial update', () => {
    const input = {
      email: 'new@example.com',
    };

    const result = UserUpdateSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should validate empty update (all optional)', () => {
    const input = {};

    const result = UserUpdateSchema.safeParse(input);

    expect(result.success).toBe(true);
  });
});
