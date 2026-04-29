/**
 * Authentication Schemas
 * 
 * Comprehensive validation schemas for authentication endpoints.
 * Uses Zod for type-safe schema validation with custom transformations.
 */

import { z } from 'zod';

// ============================================================================
// Password Validation
// ============================================================================

/**
 * Password requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
};

/**
 * Validate password meets security requirements
 */
function validatePassword(password: string): string[] {
  const errors: string[] = [];
  
  if (password.length < passwordRequirements.minLength) {
    errors.push(`Password must be at least ${passwordRequirements.minLength} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
}

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Email validation with normalization
 * - Converts to lowercase
 * - Trims whitespace
 * - Validates format
 */
const emailSchema = z
  .string({ required_error: 'Email is required' })
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be at most 255 characters')
  .transform((email) => email.toLowerCase().trim())
  .refine(
    (email) => /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email),
    'Invalid email format'
  );

// ============================================================================
// Username Validation
// ============================================================================

/**
 * Username validation rules:
 * - 3-30 characters
 * - Alphanumeric and underscores only
 * - Must start with a letter
 */
const usernameSchema = z
  .string({ required_error: 'Username is required' })
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Username must start with a letter and contain only letters, numbers, and underscores')
  .transform((username) => username.trim().toLowerCase());

// ============================================================================
// User Registration Schema
// ============================================================================

/**
 * Schema for user registration
 */
export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
    .refine(
      (password) => validatePassword(password).length === 0,
      (password) => ({
        message: validatePassword(password).join('. '),
      })
    ),
  confirmPassword: z.string({ required_error: 'Confirm password is required' }),
  firstName: z
    .string()
    .max(50, 'First name must be at most 50 characters')
    .optional()
    .transform((name) => name?.trim()),
  lastName: z
    .string()
    .max(50, 'Last name must be at most 50 characters')
    .optional()
    .transform((name) => name?.trim()),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, 'You must accept the terms and conditions'),
})
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ============================================================================
// Login Schema
// ============================================================================

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).min(1, 'Email is required'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

// ============================================================================
// Password Reset Request Schema
// ============================================================================

/**
 * Schema for requesting password reset
 */
export const passwordResetRequestSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Invalid email format'),
});

// ============================================================================
// Password Reset Confirm Schema
// ============================================================================

/**
 * Schema for confirming password reset
 */
export const passwordResetConfirmSchema = z.object({
  token: z.string({ required_error: 'Reset token is required' }).min(1, 'Reset token is required'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .refine(
      (password) => validatePassword(password).length === 0,
      (password) => ({
        message: validatePassword(password).join('. '),
      })
    ),
  confirmPassword: z.string({ required_error: 'Confirm password is required' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================================
// Change Password Schema
// ============================================================================

/**
 * Schema for changing password (authenticated users)
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string({ required_error: 'Current password is required' }).min(1, 'Current password is required'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .refine(
      (password) => validatePassword(password).length === 0,
      (password) => ({
        message: validatePassword(password).join('. '),
      })
    ),
  confirmPassword: z.string({ required_error: 'Confirm password is required' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================================
// Update Profile Schema
// ============================================================================

/**
 * Schema for updating user profile
 */
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .max(50, 'First name must be at most 50 characters')
    .optional()
    .transform((name) => name?.trim()),
  lastName: z
    .string()
    .max(50, 'Last name must be at most 50 characters')
    .optional()
    .transform((name) => name?.trim()),
  bio: z
    .string()
    .max(500, 'Bio must be at most 500 characters')
    .optional()
    .transform((bio) => bio?.trim()),
}).refine((data) => Object.values(data).some((v) => v !== undefined), {
  message: 'At least one field must be provided',
});

// ============================================================================
// Refresh Token Schema
// ============================================================================

/**
 * Schema for token refresh (optional - uses cookies primarily)
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validation result type for explicit success/failure handling
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

/**
 * Structured validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validate data against a schema and return structured errors
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: ValidationError[] = result.error.errors.map((err) => ({
    field: err.path.join('.') || 'unknown',
    message: err.message,
    code: err.code,
  }));
  
  return { success: false, errors };
}

/**
 * Validate data and throw if invalid
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    throw new ValidationException('Validation failed', errors);
  }
  
  return result.data;
}

// ============================================================================
// Custom Exceptions
// ============================================================================

/**
 * Validation exception with structured errors
 */
export class ValidationException extends Error {
  readonly type = 'ValidationException';
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  errors: ValidationError[];
  
  constructor(message: string, errors: ValidationError[]) {
    super(message);
    this.name = 'ValidationException';
    this.errors = errors;
  }
  
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.errors,
      },
    };
  }
}
