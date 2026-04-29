/**
 * Validation Schemas and Utilities
 * Centralizes input validation using Zod
 */

import { z, type ZodSchema, type ZodError } from 'zod';

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errors: this.errors,
    };
  }
}

/**
 * Validate data against a schema and throw descriptive errors
 */
export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    const prefix = context ? `${context}: ` : '';
    throw new ValidationError(`${prefix}Validation failed`, errors);
  }

  return result.data;
}

/**
 * Validate data without throwing (returns result object)
 */
export function validateSafe<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Array<{ path: string; message: string }> } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: formatZodErrors(result.error),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Format Zod errors into a readable array
 */
function formatZodErrors(error: ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((err: any) => ({
    path: err.path.join('.'),
    message: err.message,
  }));
}

// ============ Auth Schemas ============

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email must be at most 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be at most 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be at most 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
});

// ============ User Schemas ============

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
});

// ============ Common Schemas ============

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============ Type Exports ============

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

// Re-export validation utilities removed as redundant
