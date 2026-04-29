/**
 * Authentication Controller
 * 
 * REST API endpoints for authentication operations.
 * Implements proper input validation, type checking, and comprehensive error handling.
 * Uses JWT with secure httpOnly cookies for token storage.
 */

import type { Request, Response, NextFunction } from 'express';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  changePasswordSchema,
  updateProfileSchema,
  ValidationException,
} from '../schemas/auth.schema.js';
import { authService } from '../services/auth.service.js';
import { jwtService } from '../middleware/jwt.service.js';
import type { AuthenticatedUser } from '../middleware/auth.types.js';

// ============================================================================
// Cookie Configuration
// ============================================================================

const COOKIE_CONFIG = {
  accessToken: {
    name: 'access_token',
    maxAge: 15 * 60 * 1000, // 15 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  },
  refreshToken: {
    name: 'refresh_token',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  },
};

/**
 * Create a cookie string for the response
 */
function createCookie(name: string, value: string, options: {
  maxAge: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
}): string {
  return `${name}=${value}; Path=${options.path}; Max-Age=${Math.floor(options.maxAge / 1000)}; HttpOnly${options.secure ? '; Secure' : ''}; SameSite=${options.sameSite}`;
}

/**
 * Create an expired cookie for clearing tokens
 */
function createExpiredCookie(name: string, path: string = '/'): string {
  return `${name}=; Path=${path}; Max-Age=0; HttpOnly`;
}

/**
 * Clear authentication cookies
 */
function clearAuthCookies(): string[] {
  return [
    createExpiredCookie(COOKIE_CONFIG.accessToken.name),
    createExpiredCookie(COOKIE_CONFIG.refreshToken.name),
  ];
}

// ============================================================================
// Validation Helper
// ============================================================================

function parseBody<T>(schema: import('zod').ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
    
    throw new ValidationException('Invalid request data', errors);
  }
  
  return result.data;
}

// ============================================================================
// Extract Token from Request
// ============================================================================

/**
 * Extract token from Authorization header or cookies
 */
function extractToken(req: Request): string | null {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // Fallback to cookie
  return req.cookies?.[COOKIE_CONFIG.accessToken.name] ?? null;
}

/**
 * Extract refresh token from cookies
 */
function extractRefreshToken(req: Request): string | null {
  return req.cookies?.[COOKIE_CONFIG.refreshToken.name] ?? null;
}

// ============================================================================
// Auth Controller Methods
// ============================================================================

/**
 * POST /auth/register
 * Register a new user account
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = parseBody(registerSchema, req.body);
    const result = await authService.register(input);
    
    // Generate token pair
    const user: AuthenticatedUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.username,
      role: 'user',
      createdAt: result.user.createdAt,
    };
    
    const tokenPair = jwtService.generateTokenPair(user);
    
    // Set cookies
    res.setHeader('Set-Cookie', [
      createCookie(COOKIE_CONFIG.accessToken.name, tokenPair.accessToken, COOKIE_CONFIG.accessToken),
      createCookie(COOKIE_CONFIG.refreshToken.name, tokenPair.refreshToken, COOKIE_CONFIG.refreshToken),
    ]);
    
    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        message: 'Registration successful',
      },
    });
  } catch (error) {
    if (error instanceof ValidationException) {
      res.status(400).json(error.toJSON());
      return;
    }
    next(error);
  }
}

/**
 * POST /auth/login
 * Authenticate user and create session
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = parseBody(loginSchema, req.body);
    const result = await authService.login(input);
    
    // Generate token pair
    const user: AuthenticatedUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.username,
      role: 'user',
      createdAt: result.user.createdAt,
    };
    
    const tokenPair = jwtService.generateTokenPair(user);
    
    // Set cookies with optional extended expiry for remember me
    const cookies = [
      createCookie(COOKIE_CONFIG.accessToken.name, tokenPair.accessToken, COOKIE_CONFIG.accessToken),
    ];
    
    if (input.rememberMe) {
      // Extend refresh token to 30 days for remember me
      const rememberConfig = { ...COOKIE_CONFIG.refreshToken, maxAge: 30 * 24 * 60 * 60 * 1000 };
      cookies.push(createCookie(COOKIE_CONFIG.refreshToken.name, tokenPair.refreshToken, rememberConfig));
    } else {
      cookies.push(createCookie(COOKIE_CONFIG.refreshToken.name, tokenPair.refreshToken, COOKIE_CONFIG.refreshToken));
    }
    
    res.setHeader('Set-Cookie', cookies);
    
    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        expiresIn: tokenPair.expiresAt.getTime() - Date.now(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/logout
 * Invalidate user session and clear cookies
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    const refreshToken = extractRefreshToken(req);
    
    // Revoke tokens
    if (token) {
      jwtService.revokeToken(token);
    }
    
    if (refreshToken) {
      // Consume the refresh token (single use)
      jwtService.revokeToken(refreshToken);
    }
    
    // Clear cookies
    res.setHeader('Set-Cookie', clearAuthCookies());
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/refresh-token
 * Refresh access token using refresh token
 */
export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshTokenValue = extractRefreshToken(req);
    
    if (!refreshTokenValue) {
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_MISSING',
          message: 'Refresh token is required',
        },
      });
      return;
    }
    
    // Refresh tokens - this also consumes the old refresh token (single use)
    const result = jwtService.refreshTokens(refreshTokenValue);
    
    if (!result) {
      res.setHeader('Set-Cookie', clearAuthCookies());
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_INVALID',
          message: 'Invalid or expired refresh token. Please login again.',
        },
      });
      return;
    }
    
    // Set new access token cookie
    res.setHeader('Set-Cookie', [
      createCookie(COOKIE_CONFIG.accessToken.name, result.accessToken, COOKIE_CONFIG.accessToken),
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        expiresIn: 15 * 60, // 15 minutes in seconds
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /auth/me
 * Get current authenticated user
 */
export async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
