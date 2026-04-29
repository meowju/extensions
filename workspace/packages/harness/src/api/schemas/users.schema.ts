/**
 * Users Schema
 * Validation schemas for user-related endpoints
 */

import { z } from 'zod';
import { passwordSchema } from './auth.schema.js';

/**
 * User response schema (without sensitive data)
 */
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin']).default('user'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Update user profile schema
 */
export const updateUserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .optional(),
});

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

/**
 * Update user role schema (admin only)
 */
export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin'], {
    errorMap: () => ({ message: 'Role must be either "user" or "admin"' }),
  }),
});

/**
 * Type exports
 */
export type UserResponse = z.infer<typeof userResponseSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;