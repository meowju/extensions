import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createUser,
  authenticateUser,
  findUserById,
  findUserByEmail,
  isEmailTaken,
  deleteUser,
  userStore,
} from './user.service.js';

describe('User Service', () => {
  // Clear store before each test
  beforeEach(() => {
    userStore.users.clear();
    userStore.usersByEmail.clear();
    userStore.userTokenVersions.clear();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await createUser(userData);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.firstName).toBe('John');
      expect(result.user.lastName).toBe('Doe');
      expect(result.user.passwordHash).toBeUndefined(); // Should not expose hash
      expect(result.user.id).toBeDefined();
      expect(result.tokenVersion).toBe(0);
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await createUser(userData);
      await expect(createUser(userData)).rejects.toThrow('EMAIL_ALREADY_EXISTS');
    });

    it('should normalize email to lowercase', async () => {
      const userData = {
        email: 'Test@Example.COM',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await createUser(userData);
      expect(result.user.email).toBe('test@example.com');
    });

    it('should find created user by ID', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await createUser(userData);
      const foundUser = findUserById(result.user.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('test@example.com');
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate user with correct credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await createUser(userData);

      const user = await authenticateUser({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for incorrect password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await createUser(userData);

      const user = await authenticateUser({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      expect(user).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const user = await authenticateUser({
        email: 'nonexistent@example.com',
        password: 'TestPassword123',
      });

      expect(user).toBeNull();
    });

    it('should update last login time', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await createUser(userData);

      // Small delay to ensure lastLoginAt is different
      await new Promise((resolve) => setTimeout(resolve, 10));

      const user = await authenticateUser({
        email: 'test@example.com',
        password: 'TestPassword123',
      });

      expect(user?.lastLoginAt).toBeDefined();
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await createUser(userData);
      const user = findUserByEmail('test@example.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', () => {
      const user = findUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('isEmailTaken', () => {
    it('should return true for taken email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await createUser(userData);
      expect(isEmailTaken('test@example.com')).toBe(true);
    });

    it('should return false for available email', () => {
      expect(isEmailTaken('available@example.com')).toBe(false);
    });
  });

  describe('deleteUser', () => {
    it('should delete existing user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await createUser(userData);
      const deleted = deleteUser(result.user.id);

      expect(deleted).toBe(true);
      expect(findUserById(result.user.id)).toBeNull();
    });

    it('should return false for non-existent user', () => {
      const deleted = deleteUser('non-existent-id');
      expect(deleted).toBe(false);
    });
  });
});