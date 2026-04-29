import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private windowMs: number = 60000,
    private maxRequests: number = 100
  ) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  getKey(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    // If no entry or expired, create new one
    if (!entry || entry.resetTime < now) {
      const resetTime = now + this.windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime };
    }

    // Increment count
    entry.count++;

    // Check if over limit
    if (entry.count > this.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    return { allowed: true, remaining: this.maxRequests - entry.count, resetTime: entry.resetTime };
  }

  middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.getKey(req);
      const { allowed, remaining, resetTime } = this.check(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      if (!allowed) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
          },
        });
        return;
      }

      next();
    };
  }

  stop(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Default rate limiter: 100 requests per minute
export const rateLimiter = new RateLimiter(60000, 100);

// Strict rate limiter for auth endpoints: 10 requests per minute
export const authRateLimiter = new RateLimiter(60000, 10);
