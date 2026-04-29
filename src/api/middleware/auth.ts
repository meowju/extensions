/**
 * Authentication Middleware
 * JWT-based authentication for protected routes
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserPayload } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '24h';

/**
 * Verify JWT token and attach user to request
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      });
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
      (req as any).user = decoded;
      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired',
          },
        });
        return;
      }

      if (err instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid authentication token',
          },
        });
        return;
      }

      throw err;
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no token present
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
      (req as any).user = decoded;
    } catch {
      // Ignore invalid tokens for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: { id: string; email: string; role?: string }): string {
  const payload: UserPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): UserPayload | null {
  try {
    return jwt.decode(token) as UserPayload;
  } catch {
    return null;
  }
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as UserPayload | undefined;

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!roles.includes(user.role ?? 'user')) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
}

/**
 * Rate limiter middleware
 * Simple in-memory implementation - use Redis for production
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Run every minute

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * Rate limiting middleware factory
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? 'unknown';
    const key = `rate-limit:${ip}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, max - entry.count);
    const resetTime = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());

    if (entry.count > max) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          details: {
            retryAfter: Math.ceil(windowMs / 1000),
          },
        },
      });
      return;
    }

    next();
  };
}

/**
 * Pre-configured rate limiters
 */
export const standardRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests, please try again later',
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Rate limit exceeded, please slow down',
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts',
});

/**
 * CORS middleware configuration
 */
export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',');

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

/**
 * Security headers middleware
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'none';"
  );

  next();
}