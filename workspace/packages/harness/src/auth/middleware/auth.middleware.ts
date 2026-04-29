import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt.service.js';
import { findUserById } from '../services/user.service.js';
import type { TokenPayload, UserPublic } from '../types/auth.types.js';

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: UserPublic;
      tokenPayload?: TokenPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verifies access token and attaches user to request
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Authorization header is required',
      });
      return;
    }

    // Extract token from "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        message: 'Authorization header must be in format: Bearer <token>',
      });
      return;
    }

    const accessToken = parts[1];

    // Verify token
    let payload: TokenPayload;
    try {
      payload = verifyAccessToken(accessToken);
    } catch (error) {
      res.status(401).json({
        success: false,
        message:
          error instanceof Error && error.message.includes('expired')
            ? 'Access token has expired'
            : 'Invalid access token',
      });
      return;
    }

    // Get user from database
    const user = findUserById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Attach user and token payload to request
    req.user = user;
    req.tokenPayload = payload;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no token provided
 */
export function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      next();
      return;
    }

    const accessToken = parts[1];

    try {
      const payload = verifyAccessToken(accessToken);
      const user = findUserById(payload.userId);
      if (user) {
        req.user = user;
        req.tokenPayload = payload;
      }
    } catch {
      // Token invalid or expired - continue without user
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Error handler for authentication errors
 */
export function authErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err.message.includes('token')) {
    res.status(401).json({
      success: false,
      message: err.message,
    });
    return;
  }
  next(err);
}