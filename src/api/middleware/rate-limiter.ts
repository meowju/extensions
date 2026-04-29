/**
 * Rate Limiting Middleware
 * Token bucket algorithm with sliding window for API rate limiting
 */

import type { Request, Response, NextFunction } from 'express';

// ============================================
// Types
// ============================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key generator function (default: IP address) */
  keyGenerator?: (req: Request) => string;
  /** Custom handler when rate limit exceeded */
  handler?: (req: Request, res: Response) => void;
  /** Skip rate limiting for certain requests */
  skip?: (req: Request) => boolean;
  /** Store for tracking requests (can use Redis in production) */
  store?: RateLimitStore;
  /** Message to include in response when rate limited */
  message?: string;
  /** Enable headers for rate limit info */
  standardHeaders?: boolean;
  /** Enable X-RateLimit-* headers (legacy) */
  legacyHeaders?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export interface RateLimitStore {
  increment(key: string): Promise<{ count: number; resetTime: number }>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  resetAll?(): Promise<void>;
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends Error {
  public readonly statusCode = 429;
  public readonly name = 'RateLimitExceededError';
  public readonly retryAfter: number;

  constructor(retryAfterSeconds: number, message?: string) {
    super(message || `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`);
    this.retryAfter = retryAfterSeconds;
  }
}

// ============================================
// In-Memory Store (default for single instance)
// ============================================

interface StoreEntry {
  count: number;
  resetTime: number;
}

export class MemoryStore implements RateLimitStore {
  private storage = new Map<string, StoreEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cleanupIntervalMs = 60000) {
    // Clean up expired entries periodically
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.storage.entries()) {
        if (entry.resetTime < now) {
          this.storage.delete(key);
        }
      }
    }, cleanupIntervalMs);
  }

  async increment(key: string): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const entry = this.storage.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      const resetTime = now + this.windowMs;
      this.storage.set(key, { count: 1, resetTime });
      return { count: 1, resetTime };
    }

    // Increment existing entry
    entry.count++;
    return { count: entry.count, resetTime: entry.resetTime };
  }

  async decrement(key: string): Promise<void> {
    const entry = this.storage.get(key);
    if (entry && entry.count > 0) {
      entry.count--;
    }
  }

  async resetKey(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async resetAll(): Promise<void> {
    this.storage.clear();
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const entry = this.storage.get(key);
    if (!entry || entry.resetTime < Date.now()) {
      return null;
    }
    return { count: entry.count, resetTime: entry.resetTime };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
  }

  // Configuration (would be set by rateLimit function)
  windowMs = 60000;
}

// ============================================
// Rate Limit Middleware Factory
// ============================================

/**
 * Create rate limiting middleware
 * @param options Configuration options
 */
export function rateLimit(options: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => void {
  const {
    max = 100,
    windowMs = 60000,
    keyGenerator = defaultKeyGenerator,
    handler = defaultHandler,
    skip = () => false,
    store = new MemoryStore(),
    message = 'Too many requests, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
  } = options;

  // Set window on store if it's a MemoryStore
  if (store instanceof MemoryStore) {
    store.windowMs = windowMs;
  }

  const requestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip if condition is met
    if (skip(req)) {
      next();
      return;
    }

    // Get key for this request
    const key = keyGenerator(req);

    try {
      // Increment counter
      const { count, resetTime } = await store.increment(key);

      // Set rate limit headers
      if (standardHeaders) {
        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(Math.max(0, max - count)));
        res.setHeader('RateLimit-Reset', new Date(resetTime).toUTCString());
      }

      if (legacyHeaders) {
        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - count)));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));
      }

      // Check if limit exceeded
      if (count > max) {
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        handler(req, res);
        return;
      }

      next();
    } catch (error) {
      // If store fails, allow request to proceed (fail open)
      console.error('Rate limit store error:', error);
      next();
    }
  };

  return requestHandler;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: Request): string {
  // Check for proxy headers (when behind load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }

  // Check for real IP header (nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fall back to socket address
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Default handler when rate limit exceeded
 */
function defaultHandler(req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  });
}

// ============================================
// Pre-configured Rate Limiters
// ============================================

/**
 * Create middleware for general API rate limiting
 * Default: 100 requests per minute per IP
 */
export function createApiRateLimiter(options?: Partial<RateLimitConfig>) {
  return rateLimit({
    max: 100,
    windowMs: 60000, // 1 minute
    message: 'Too many API requests, please try again later.',
    ...options,
  });
}

/**
 * Create middleware for strict rate limiting
 * Default: 10 requests per minute per IP
 */
export function createStrictRateLimiter(options?: Partial<RateLimitConfig>) {
  return rateLimit({
    max: 10,
    windowMs: 60000,
    message: 'Too many requests. Please slow down.',
    ...options,
  });
}

/**
 * Create middleware for auth endpoints (login, register, etc.)
 * Default: 5 requests per minute per IP
 */
export function createAuthRateLimiter(options?: Partial<RateLimitConfig>) {
  return rateLimit({
    max: 5,
    windowMs: 60000,
    message: 'Too many authentication attempts. Please try again later.',
    ...options,
  });
}

/**
 * Create middleware for file upload endpoints
 * Default: 20 requests per minute per IP
 */
export function createUploadRateLimiter(options?: Partial<RateLimitConfig>) {
  return rateLimit({
    max: 20,
    windowMs: 60000,
    message: 'Too many upload requests. Please try again later.',
    ...options,
  });
}

/**
 * Create middleware for search endpoints
 * Default: 30 requests per minute per IP
 */
export function createSearchRateLimiter(options?: Partial<RateLimitConfig>) {
  return rateLimit({
    max: 30,
    windowMs: 60000,
    message: 'Too many search requests. Please try again later.',
    ...options,
  });
}

/**
 * Create middleware for per-user rate limiting
 * Requires authenticated requests
 * Default: 1000 requests per hour per user
 */
export function createUserRateLimiter(options?: Partial<RateLimitConfig>) {
  return rateLimit({
    max: 1000,
    windowMs: 3600000, // 1 hour
    keyGenerator: (req) => {
      // Use authenticated user ID if available
      if (req.user?.id) {
        return `user:${req.user.id}`;
      }
      // Fall back to IP
      return defaultKeyGenerator(req);
    },
    message: 'Rate limit exceeded for your account. Please try again later.',
    ...options,
  });
}

// ============================================
// Skip Functions (for common conditions)
// ============================================

/**
 * Skip rate limiting for requests with specific API keys
 */
export function skipWithApiKey(apiKeys: Set<string>) {
  return (req: Request): boolean => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const key = Array.isArray(apiKey) ? apiKey[0] : apiKey;
      return apiKeys.has(key);
    }
    return false;
  };
}

/**
 * Skip rate limiting for localhost
 */
export function skipLocalhost(): (req: Request) => boolean {
  return (req: Request): boolean => {
    const host = req.headers.host || '';
    return host.includes('localhost') || host.includes('127.0.0.1');
  };
}

/**
 * Skip rate limiting for authenticated premium users
 */
export function skipPremiumUsers(): (req: Request) => boolean {
  return (req: Request): boolean => {
    if (!req.user) return false;
    // Could check user role or subscription status
    return req.user.role === 'admin' || req.user.role === 'moderator';
  };
}

// ============================================
// Express Request Type Augmentation
// ============================================

declare global {
  namespace Express {
    interface Request {
      rateLimit?: RateLimitInfo;
    }
  }
}
