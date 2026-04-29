import { z } from 'zod';

// User entity type
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isEmailVerified: boolean;
}

// User without sensitive data (for API responses)
export type UserPublic = Omit<User, 'passwordHash'>;

// Token payloads
export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

// Token pair returned to clients
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// Registration DTOs
export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// Login DTOs
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Refresh token DTO
export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: z.ZodError['errors'];
}

export interface AuthResponse {
  user: UserPublic;
  tokens: AuthTokens;
}

// Error codes
export enum AuthErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_TOKEN_REVOKED = 'REFRESH_TOKEN_REVOKED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}