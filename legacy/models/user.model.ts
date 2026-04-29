/**
 * User Model - Mongoose Schema with Bcrypt Password Hashing
 * 
 * Features:
 * - Secure password hashing with bcrypt (cost factor 12)
 * - Email-based authentication
 * - Account verification status
 * - Password reset tokens with expiration
 * - Timestamps and soft delete support
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import { z } from 'zod';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface IUser {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  generateVerificationToken(): string;
  generatePasswordResetToken(): string;
  clearPasswordResetToken(): Promise<void>;
}

export interface UserDocument extends IUser, Document, IUserMethods {}

export interface UserModel extends Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
  isEmailTaken(email: string, excludeUserId?: string): Promise<boolean>;
}

// ============================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================

export const UserRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase, one lowercase, one number, and one special character'
    ),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
});

export const UserLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const PasswordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase, one lowercase, one number, and one special character'
    ),
});

export type UserRegistrationInput = z.infer<typeof UserRegistrationSchema>;
export type UserLoginInput = z.infer<typeof UserLoginSchema>;
export type PasswordUpdateInput = z.infer<typeof PasswordUpdateSchema>;

// ============================================================
// CONSTANTS
// ============================================================

const BCRYPT_SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_BYTES = 32;
const PASSWORD_RESET_TOKEN_BYTES = 32;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

// ============================================================
// MONGOOSE SCHEMA
// ============================================================

const userSchema = new Schema<UserDocument, UserModel>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be less than 30 characters'],
      match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'],
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name must be less than 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name must be less than 50 characters'],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetTokenExpires: {
      type: Date,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.verificationToken;
        delete ret.verificationTokenExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetTokenExpires;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ============================================================
// INDEXES
// ============================================================

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { sparse: true });
userSchema.index({ verificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ createdAt: -1 });

// ============================================================
// PRE-SAVE HOOK - HASH PASSWORD
// ============================================================

userSchema.pre('save', async function (next) {
  // Only hash password if it's modified or new
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// ============================================================
// INSTANCE METHODS
// ============================================================

/**
 * Compare candidate password with hashed password
 */
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if account is locked due to failed login attempts
 */
userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

/**
 * Increment login attempts after failed login
 */
userSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < new Date()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    const updates: Partial<IUser> = { loginAttempts: this.loginAttempts + 1 };
    
    // Lock account if max attempts reached
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
      updates.lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
    }
    
    Object.assign(this, updates);
  }
};

/**
 * Reset login attempts after successful login
 */
userSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLoginAt = new Date();
};

/**
 * Generate email verification token
 */
userSchema.methods.generateVerificationToken = function (): string {
  const token = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
  this.verificationToken = token;
  this.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

/**
 * Generate password reset token
 */
userSchema.methods.generatePasswordResetToken = function (): string {
  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
  this.passwordResetToken = token;
  this.passwordResetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token;
};

/**
 * Clear password reset token after use
 */
userSchema.methods.clearPasswordResetToken = async function (): Promise<void> {
  this.passwordResetToken = undefined;
  this.passwordResetTokenExpires = undefined;
};

// ============================================================
// STATIC METHODS
// ============================================================

/**
 * Find user by email address
 */
userSchema.statics.findByEmail = function (
  email: string
): Promise<UserDocument | null> {
  return this.findOne({ email: email.toLowerCase() }).exec();
};

/**
 * Check if email is already taken
 */
userSchema.statics.isEmailTaken = async function (
  email: string,
  excludeUserId?: string
): Promise<boolean> {
  const query: Record<string, unknown> = { email: email.toLowerCase() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const user = await this.findOne(query).select('_id').lean();
  return !!user;
};

// ============================================================
// EXPORT MODEL
// ============================================================

// Prevent model recompilation in development hot-reload
export const User = (mongoose.models.User as UserModel) ||
  mongoose.model<UserDocument, UserModel>('User', userSchema);

export default User;
