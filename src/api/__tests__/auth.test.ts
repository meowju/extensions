/**
 * Authentication Schemas Tests
 * 
 * Comprehensive unit tests for authentication validation schemas.
 * Tests cover:
 * - Valid input acceptance
 * - Invalid input rejection
 * - Edge cases and boundary conditions
 * - Type transformations
 */

import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  changePasswordSchema,
  updateProfileSchema,
  validate,
  ValidationException,
} from '../schemas/auth.schema.js';

describe('Auth Schemas', () => {
  // ==========================================================================
  // Register Schema Tests
  // ==========================================================================
  
  describe('registerSchema', () => {
    describe('valid inputs', () => {
      it('should validate complete valid registration', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
        
        if (result.success) {
          expect(result.data.email).toBe('test@example.com');
          expect(result.data.username).toBe('testuser');
          expect(result.data.firstName).toBe('John');
          expect(result.data.lastName).toBe('Doe');
        }
      });

      it('should validate minimal valid registration', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should normalize email to lowercase', () => {
        const input = {
          email: 'TEST@EXAMPLE.COM',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
        
        if (result.success) {
          expect(result.data.email).toBe('test@example.com');
        }
      });

      it('should trim whitespace from username', () => {
        const input = {
          email: 'test@example.com',
          username: '  testuser  ',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
        
        if (result.success) {
          expect(result.data.username).toBe('testuser');
        }
      });

      it('should trim whitespace from names', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          firstName: '  John  ',
          lastName: '  Doe  ',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
        
        if (result.success) {
          expect(result.data.firstName).toBe('John');
          expect(result.data.lastName).toBe('Doe');
        }
      });
    });

    describe('email validation', () => {
      it('should reject missing email', () => {
        const input = {
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty email', () => {
        const input = {
          email: '',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid email format', () => {
        const invalidEmails = [
          'notanemail',
          'missing@domain',
          '@nodomain.com',
          'spaces in@email.com',
          'email@.com',
        ];

        for (const email of invalidEmails) {
          const input = {
            email,
            username: 'testuser',
            password: 'SecurePass123!',
            confirmPassword: 'SecurePass123!',
            acceptTerms: true,
          };

          const result = registerSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      });

      it('should reject email longer than 255 characters', () => {
        const input = {
          email: 'a'.repeat(250) + '@test.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('username validation', () => {
      it('should reject missing username', () => {
        const input = {
          email: 'test@example.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject username shorter than 3 characters', () => {
        const input = {
          email: 'test@example.com',
          username: 'ab',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject username longer than 30 characters', () => {
        const input = {
          email: 'test@example.com',
          username: 'a'.repeat(31),
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject username starting with number', () => {
        const input = {
          email: 'test@example.com',
          username: '123user',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject username with invalid characters', () => {
        const input = {
          email: 'test@example.com',
          username: 'user@name',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should accept username with underscores', () => {
        const input = {
          email: 'test@example.com',
          username: 'test_user_123',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('password validation', () => {
      it('should reject missing password', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject password shorter than 8 characters', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'Short1!',
          confirmPassword: 'Short1!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject password without uppercase', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'lowercase123!',
          confirmPassword: 'lowercase123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject password without lowercase', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'UPPERCASE123!',
          confirmPassword: 'UPPERCASE123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject password without digit', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'NoDigits!!!',
          confirmPassword: 'NoDigits!!!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject password without special character', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'NoSpecial123',
          confirmPassword: 'NoSpecial123',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should accept valid password with all requirements', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'ValidPass1!',
          confirmPassword: 'ValidPass1!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('password confirmation', () => {
      it('should reject mismatched passwords', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'DifferentPass1!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should accept matching passwords', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('terms acceptance', () => {
      it('should reject when terms not accepted', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: false,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should accept when terms accepted', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('name length validation', () => {
      it('should reject firstName longer than 50 characters', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          firstName: 'a'.repeat(51),
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject lastName longer than 50 characters', () => {
        const input = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          lastName: 'a'.repeat(51),
          acceptTerms: true,
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Login Schema Tests
  // ==========================================================================

  describe('loginSchema', () => {
    it('should validate valid login', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept optional rememberMe', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const input = {
        password: 'password123',
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty email', () => {
      const input = {
        email: '',
        password: 'password123',
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const input = {
        email: 'test@example.com',
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Password Reset Request Schema Tests
  // ==========================================================================

  describe('passwordResetRequestSchema', () => {
    it('should validate valid email', () => {
      const input = {
        email: 'test@example.com',
      };

      const result = passwordResetRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const input = {
        email: 'notanemail',
      };

      const result = passwordResetRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const input = {};

      const result = passwordResetRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Password Reset Confirm Schema Tests
  // ==========================================================================

  describe('passwordResetConfirmSchema', () => {
    it('should validate valid reset', () => {
      const input = {
        token: 'valid-token-123',
        newPassword: 'NewSecure123!',
        confirmPassword: 'NewSecure123!',
      };

      const result = passwordResetConfirmSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject missing token', () => {
      const input = {
        newPassword: 'NewSecure123!',
        confirmPassword: 'NewSecure123!',
      };

      const result = passwordResetConfirmSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty token', () => {
      const input = {
        token: '',
        newPassword: 'NewSecure123!',
        confirmPassword: 'NewSecure123!',
      };

      const result = passwordResetConfirmSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject mismatched passwords', () => {
      const input = {
        token: 'valid-token-123',
        newPassword: 'NewSecure123!',
        confirmPassword: 'Different123!',
      };

      const result = passwordResetConfirmSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const input = {
        token: 'valid-token-123',
        newPassword: 'weak',
        confirmPassword: 'weak',
      };

      const result = passwordResetConfirmSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Change Password Schema Tests
  // ==========================================================================

  describe('changePasswordSchema', () => {
    it('should validate valid change', () => {
      const input = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewSecure123!',
        confirmPassword: 'NewSecure123!',
      };

      const result = changePasswordSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject missing current password', () => {
      const input = {
        newPassword: 'NewSecure123!',
        confirmPassword: 'NewSecure123!',
      };

      const result = changePasswordSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject weak new password', () => {
      const input = {
        currentPassword: 'OldPass123!',
        newPassword: 'weak',
        confirmPassword: 'weak',
      };

      const result = changePasswordSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Update Profile Schema Tests
  // ==========================================================================

  describe('updateProfileSchema', () => {
    it('should validate update with firstName', () => {
      const input = {
        firstName: 'Jane',
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate update with lastName', () => {
      const input = {
        lastName: 'Doe',
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate update with bio', () => {
      const input = {
        bio: 'This is my bio',
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate update with multiple fields', () => {
      const input = {
        firstName: 'Jane',
        lastName: 'Doe',
        bio: 'This is my bio',
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty update', () => {
      const input = {};

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject bio longer than 500 characters', () => {
      const input = {
        bio: 'a'.repeat(501),
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should trim bio whitespace', () => {
      const input = {
        bio: '  My bio  ',
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.bio).toBe('My bio');
      }
    });
  });

  // ==========================================================================
  // Utility Function Tests
  // ==========================================================================

  describe('validate helper', () => {
    it('should return success result for valid data', () => {
      const input = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        acceptTerms: true,
      };

      const result = validate(registerSchema, input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should return error result for invalid data', () => {
      const input = {
        email: 'invalid',
        username: 'ab',
        password: 'weak',
        confirmPassword: 'different',
        acceptTerms: false,
      };

      const result = validate(registerSchema, input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].field).toBeDefined();
        expect(result.errors[0].message).toBeDefined();
      }
    });
  });

  describe('ValidationException', () => {
    it('should create exception with errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too weak' },
      ];

      const exception = new ValidationException('Validation failed', errors);
      
      expect(exception.message).toBe('Validation failed');
      expect(exception.errors).toEqual(errors);
      expect(exception.statusCode).toBe(400);
      expect(exception.code).toBe('VALIDATION_ERROR');
    });

    it('should serialize to JSON correctly', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
      ];

      const exception = new ValidationException('Validation failed', errors);
      const json = exception.toJSON();
      
      expect(json).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors,
        },
      });
    });
  });
});
