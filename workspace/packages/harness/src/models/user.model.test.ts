/**
 * User Model Unit Tests
 * 
 * Tests for User model, password hashing, and schema validation.
 * 
 * Database tests require MongoDB to be running.
 * Set SKIP_DB_TESTS=true to skip database-dependent tests.
 * 
 * Run with: npm test -- src/models/user.model.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// Check if we should skip database tests
const skipDBTests = process.env.SKIP_DB_TESTS === 'true';

// Mock mongoose for conditional imports
let mongoose: typeof import('mongoose');
let MongoMemoryServer: typeof import('mongodb-memory-server').MongoMemoryServer;
let User: import('./user.model').UserModel;
let UserDocument: typeof import('./user.model').UserDocument;
let UserRegistrationSchema: typeof import('./user.model').UserRegistrationSchema;

describe('UserRegistrationSchema (Zod)', () => {
  beforeAll(async () => {
    const module = await import('./user.model');
    UserRegistrationSchema = module.UserRegistrationSchema;
  });

  describe('Valid inputs', () => {
    it('should accept valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = UserRegistrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept minimal valid data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const result = UserRegistrationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept password with common special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '+', '='];
      
      for (const char of specialChars) {
        const validData = {
          email: 'test@example.com',
          password: `ValidPass1${char}`,
        };
        const result = UserRegistrationSchema.safeParse(validData);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Invalid inputs', () => {
    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('email');
      }
    });

    it('should reject email without @', () => {
      const invalidData = {
        email: 'testexample.com',
        password: 'SecurePass123!',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject email without domain', () => {
      const invalidData = {
        email: 'test@',
        password: 'SecurePass123!',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Short1!',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('password');
      }
    });

    it('should reject password without uppercase', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'lowercase123!',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'UPPERCASE123!',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'NoNumbers!',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'NoSpecialChar123',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password longer than 100 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'A'.repeat(101) + 'a1!',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject username with special characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'invalid@user!',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('username');
      }
    });

    it('should reject short username', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'ab',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject username longer than 30 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'a'.repeat(31),
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject firstName longer than 50 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'A'.repeat(51),
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty required fields', () => {
      const invalidData = {
        email: '',
        password: '',
      };

      const result = UserRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

// Database-dependent tests (only run when MongoDB is available)
const describeDB = skipDBTests ? describe.skip : describe;

describeDB('User Model (Database Tests)', () => {
  let mongoServer: InstanceType<typeof MongoMemoryServer>;

  beforeAll(async () => {
    if (skipDBTests) {
      return;
    }

    try {
      mongoose = await import('mongoose');
      const mms = await import('mongodb-memory-server');
      MongoMemoryServer = mms.MongoMemoryServer;

      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);

      const userModule = await import('./user.model');
      User = userModule.User;
    } catch (error) {
      console.warn('MongoDB memory server not available, skipping database tests');
      throw new Error('SKIP_DB_TESTS');
    }
  });

  afterAll(async () => {
    if (skipDBTests || !mongoServer) {
      return;
    }
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    if (!skipDBTests && User) {
      await User.deleteMany({});
    }
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2[ab]\$/);
    });

    it('should not rehash password if not modified', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const user = new User(userData);
      await user.save();

      const originalHash = user.password;
      user.firstName = 'John';
      await user.save();

      expect(user.password).toBe(originalHash);
    });

    it('should rehash password when password is modified', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const user = new User(userData);
      await user.save();

      const originalHash = user.password;
      user.password = 'NewPassword456!';
      await user.save();

      expect(user.password).not.toBe(originalHash);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });
      await user.save();

      const isMatch = await user.comparePassword('TestPassword123!');
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });
      await user.save();

      const isMatch = await user.comparePassword('WrongPassword123!');
      expect(isMatch).toBe(false);
    });
  });

  describe('Login Attempts & Locking', () => {
    it('should lock account after 5 failed attempts', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });
      await user.save();

      for (let i = 0; i < 5; i++) {
        await user.incrementLoginAttempts();
      }
      await user.save();

      expect(user.isLocked()).toBe(true);
    });

    it('should reset login attempts on successful reset', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });
      await user.save();

      user.loginAttempts = 3;
      await user.save();

      await user.resetLoginAttempts();
      await user.save();

      expect(user.loginAttempts).toBe(0);
      expect(user.lockUntil).toBeUndefined();
      expect(user.lastLoginAt).toBeDefined();
    });
  });

  describe('Verification Token', () => {
    it('should generate valid verification token', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      const token = user.generateVerificationToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
      expect(user.verificationToken).toBe(token);
      expect(user.verificationTokenExpires).toBeDefined();
    });
  });

  describe('Password Reset Token', () => {
    it('should generate valid password reset token', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      const token = user.generatePasswordResetToken();

      expect(token).toBeDefined();
      expect(token.length).toBe(64);
      expect(user.passwordResetToken).toBe(token);
    });

    it('should clear password reset token', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      user.generatePasswordResetToken();
      expect(user.passwordResetToken).toBeDefined();

      await user.clearPasswordResetToken();

      expect(user.passwordResetToken).toBeUndefined();
      expect(user.passwordResetTokenExpires).toBeUndefined();
    });
  });

  describe('Email Handling', () => {
    it('should convert email to lowercase', async () => {
      const user = new User({
        email: 'Test@EXAMPLE.COM',
        password: 'TestPassword123!',
      });
      await user.save();

      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from email', async () => {
      const user = new User({
        email: '  test@example.com  ',
        password: 'TestPassword123!',
      });
      await user.save();

      expect(user.email).toBe('test@example.com');
    });

    it('should enforce unique email constraint', async () => {
      const user1 = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });
      await user1.save();

      const user2 = new User({
        email: 'test@example.com',
        password: 'DifferentPassword123!',
      });

      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('Static Methods', () => {
    describe('findByEmail', () => {
      it('should find user by email (case insensitive)', async () => {
        await User.create({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });

        const foundUser = await User.findByEmail('TEST@EXAMPLE.COM');
        expect(foundUser).toBeDefined();
        expect(foundUser?.email).toBe('test@example.com');
      });

      it('should return null for non-existent email', async () => {
        const foundUser = await User.findByEmail('nonexistent@example.com');
        expect(foundUser).toBeNull();
      });
    });

    describe('isEmailTaken', () => {
      it('should return true if email is taken', async () => {
        await User.create({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });

        const isTaken = await User.isEmailTaken('test@example.com');
        expect(isTaken).toBe(true);
      });

      it('should return false if email is not taken', async () => {
        const isTaken = await User.isEmailTaken('newuser@example.com');
        expect(isTaken).toBe(false);
      });
    });
  });

  describe('JSON Serialization', () => {
    it('should exclude sensitive fields from toJSON', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });
      await user.save();

      const json = user.toJSON();

      expect(json.password).toBeUndefined();
      expect(json.verificationToken).toBeUndefined();
      expect(json.passwordResetToken).toBeUndefined();
      expect(json.loginAttempts).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.email).toBe('test@example.com');
    });
  });

  describe('Default Values', () => {
    it('should set isEmailVerified to false by default', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });
      await user.save();

      expect(user.isEmailVerified).toBe(false);
    });

    it('should set isActive to true by default', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });
      await user.save();

      expect(user.isActive).toBe(true);
    });

    it('should set loginAttempts to 0 by default', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });
      await user.save();

      expect(user.loginAttempts).toBe(0);
    });
  });
});
