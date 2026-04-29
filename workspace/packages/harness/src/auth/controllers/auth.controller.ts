import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, z } from 'zod';
import {
  TokenPayload,
  AuthResponse,
  AuthTokens,
  UserPublic,
} from '../types/auth.types.js';
import {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../services/jwt.service.js';
import {
  createUser,
  authenticateUser,
  findUserById,
  getTokenVersion,
  incrementTokenVersion,
} from '../services/user.service.js';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
} from '../types/auth.types.js';

/**
 * Auth Controller - handles all authentication endpoints
 */
export class AuthController {
  /**
   * POST /auth/register
   * Create a new user account
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const validationResult = RegisterRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          errors: validationResult.error.errors,
          message: 'Validation failed',
        });
        return;
      }

      const { email, password, firstName, lastName } = validationResult.data;

      // Create user
      const result = await createUser({
        email,
        password,
        firstName,
        lastName,
      });

      // Generate tokens
      const tokens = generateTokens({
        userId: result.user.id,
        email: result.user.email,
        tokenVersion: result.tokenVersion,
      });

      // Return response
      const response: AuthResponse = {
        user: result.user,
        tokens,
      };

      res.status(201).json({
        success: true,
        data: response,
        message: 'User registered successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
        res.status(409).json({
          success: false,
          message: 'Email address is already registered',
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /auth/login
   * Authenticate user and return tokens
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const validationResult = LoginRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          errors: validationResult.error.errors,
          message: 'Validation failed',
        });
        return;
      }

      const { email, password } = validationResult.data;

      // Authenticate user
      const user = await authenticateUser({
        email,
        password,
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Generate tokens
      const tokenVersion = getTokenVersion(user.id);
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        tokenVersion,
      });

      // Return response
      const response: AuthResponse = {
        user,
        tokens,
      };

      res.status(200).json({
        success: true,
        data: response,
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const validationResult = RefreshTokenRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          errors: validationResult.error.errors,
          message: 'Validation failed',
        });
        return;
      }

      const { refreshToken } = validationResult.data;

      // Verify refresh token
      let tokenData: { userId: string; tokenVersion: number };
      try {
        tokenData = verifyRefreshToken(refreshToken);
      } catch (error) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
        });
        return;
      }

      // Get user
      const user = findUserById(tokenData.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Generate new token pair (refresh token rotation)
      const newTokenVersion = getTokenVersion(user.id);
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        tokenVersion: newTokenVersion,
      });

      // Return response
      res.status(200).json({
        success: true,
        data: tokens,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout
   * Invalidate refresh token
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        revokeRefreshToken(refreshToken);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout-all
   * Invalidate all refresh tokens for the user
   */
  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // User ID from authenticated request
      const userId = (req as Request & { user?: TokenPayload }).user?.userId;

      if (userId) {
        revokeAllUserTokens(userId);
        incrementTokenVersion(userId);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const authController = new AuthController();