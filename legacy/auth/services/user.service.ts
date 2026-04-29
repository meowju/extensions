/**
 * User Service - Business Logic for User Registration and Management
 * 
 * Handles user creation, password management, and account operations.
 */

import { User, UserDocument, UserRegistrationInput } from '../../models/user.model';
import { ZodError } from 'zod';

export class UserServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

export interface RegistrationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    isEmailVerified: boolean;
    createdAt: Date;
  };
  verificationToken?: string;
  error?: string;
}

export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username?: string;
    isEmailVerified: boolean;
    lastLoginAt?: Date;
  };
  error?: string;
  errorCode?: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_INACTIVE' | 'EMAIL_NOT_VERIFIED';
}

/**
 * User Service - handles all user-related business logic
 */
export class UserService {
  /**
   * Register a new user
   */
  async register(input: UserRegistrationInput): Promise<RegistrationResult> {
    try {
      // Validate input with Zod
      const validatedData = UserRegistrationInput.parse(input);

      // Check if email is already taken
      const emailTaken = await User.isEmailTaken(validatedData.email);
      if (emailTaken) {
        return {
          success: false,
          error: 'Email address is already registered',
        };
      }

      // Check if username is taken (if provided)
      if (validatedData.username) {
        const existingUsername = await User.findOne({ username: validatedData.username });
        if (existingUsername) {
          return {
            success: false,
            error: 'Username is already taken',
          };
        }
      }

      // Create user document
      const user = new User({
        email: validatedData.email.toLowerCase(),
        password: validatedData.password, // Will be hashed by pre-save hook
        username: validatedData.username,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });

      // Generate verification token
      const verificationToken = user.generateVerificationToken();

      // Save to database
      await user.save();

      return {
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
        verificationToken,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => e.message).join(', ');
        return {
          success: false,
          error: `Validation failed: ${messages}`,
        };
      }

      // Handle MongoDB duplicate key error
      if ((error as any).code === 11000) {
        const field = Object.keys((error as any).keyPattern || {})[0] || 'field';
        return {
          success: false,
          error: `${field} is already in use`,
        };
      }

      console.error('Registration error:', error);
      return {
        success: false,
        error: 'An error occurred during registration. Please try again.',
      };
    }
  }

  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      // Find user with password field (excluded by default)
      const user = await User.findByEmail(email).select('+password');

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account has been deactivated',
          errorCode: 'ACCOUNT_INACTIVE',
        };
      }

      // Check if account is locked
      if (user.isLocked()) {
        const lockTime = user.lockUntil!;
        const minutesRemaining = Math.ceil((lockTime.getTime() - Date.now()) / 60000);
        return {
          success: false,
          error: `Account is locked due to too many failed attempts. Try again in ${minutesRemaining} minutes.`,
          errorCode: 'ACCOUNT_LOCKED',
        };
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        // Increment login attempts
        await user.incrementLoginAttempts();
        await user.save();

        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();
      await user.save();

      return {
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          isEmailVerified: user.isEmailVerified,
          lastLoginAt: user.lastLoginAt,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'An error occurred during login. Please try again.',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserDocument | null> {
    try {
      return await User.findById(userId);
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserDocument | null> {
    try {
      return await User.findByEmail(email);
    } catch (error) {
      console.error('Get user by email error:', error);
      return null;
    }
  }

  /**
   * Verify user email with token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: new Date() },
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid or expired verification token',
        };
      }

      user.isEmailVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();

      return { success: true };
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        error: 'An error occurred during email verification',
      };
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; resetToken?: string; error?: string }> {
    try {
      const user = await User.findByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        return {
          success: true,
          // Note: In production, you would send an email even if user not found
          // but log it internally. Here we just return success.
        };
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      return {
        success: true,
        resetToken, // In production, this would be sent via email
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        error: 'An error occurred. Please try again later.',
      };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate password format
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (!passwordRegex.test(newPassword) || newPassword.length < 8) {
        return {
          success: false,
          error: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
        };
      }

      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetTokenExpires: { $gt: new Date() },
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid or expired reset token',
        };
      }

      // Update password (will be hashed by pre-save hook)
      user.password = newPassword;
      await user.clearPasswordResetToken();
      await user.save();

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: 'An error occurred during password reset',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: {
      username?: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<{ success: boolean; user?: UserDocument; error?: string }> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Check if username is taken by another user
      if (updates.username && updates.username !== user.username) {
        const existingUser = await User.findOne({ username: updates.username });
        if (existingUser) {
          return {
            success: false,
            error: 'Username is already taken',
          };
        }
      }

      // Apply updates
      if (updates.username !== undefined) user.username = updates.username;
      if (updates.firstName !== undefined) user.firstName = updates.firstName;
      if (updates.lastName !== undefined) user.lastName = updates.lastName;

      await user.save();

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: 'An error occurred while updating profile',
      };
    }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await User.findById(userId).select('+password');

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      // Update password (will be hashed by pre-save hook)
      user.password = newPassword;
      await user.save();

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'An error occurred while changing password',
      };
    }
  }

  /**
   * Deactivate user account (soft delete)
   */
  async deactivateAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      user.isActive = false;
      await user.save();

      return { success: true };
    } catch (error) {
      console.error('Deactivate account error:', error);
      return {
        success: false,
        error: 'An error occurred while deactivating account',
      };
    }
  }

  /**
   * List users (admin function)
   */
  async listUsers(
    options: {
      page?: number;
      limit?: number;
      isActive?: boolean;
      isEmailVerified?: boolean;
    } = {}
  ): Promise<{
    users: UserDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100);
      const skip = (page - 1) * limit;

      const query: Record<string, any> = {};
      if (options.isActive !== undefined) query.isActive = options.isActive;
      if (options.isEmailVerified !== undefined) query.isEmailVerified = options.isEmailVerified;

      const [users, total] = await Promise.all([
        User.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
        User.countDocuments(query),
      ]);

      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('List users error:', error);
      return {
        users: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };
    }
  }
}

// Export singleton instance
export const userService = new UserService();
export default userService;
