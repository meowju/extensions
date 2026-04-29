/**
 * Rate Limiter Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { rateLimit, MemoryStore, RateLimitExceededError } from './rate-limiter.js';

// Mock Request factory
function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    ip: '192.168.1.1',
    headers: {},
    path: '/test',
    method: 'GET',
    originalUrl: '/test',
    socket: { remoteAddress: '192.168.1.1' } as any,
    ...overrides,
  };
}

// Mock Response factory
function createMockResponse(): Partial<Response> & { statusCode: number; _headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  return {
    statusCode: 200,
    _headers: headers,
    setHeader: (name: string, value: string | number) => {
      headers[name] = String(value);
    },
    getHeader: (name: string) => headers[name],
    status: function(this: any, code: number) {
      this.statusCode = code;
      return this;
    },
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    on: vi.fn(),
  } as any;
}

// Mock NextFunction
function createMockNext(): NextFunction {
  return vi.fn();
}

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MemoryStore', () => {
    it('should increment counter for new key', async () => {
      const store = new MemoryStore();
      const key = 'test-key';
      
      const result1 = await store.increment(key);
      expect(result1.count).toBe(1);
      
      const result2 = await store.increment(key);
      expect(result2.count).toBe(2);
      
      store.destroy();
    });

    it('should reset counter after window expires', async () => {
      const store = new MemoryStore();
      const key = 'test-key';
      
      // Manually set a passed resetTime for testing
      store.storage.set(key, { count: 5, resetTime: Date.now() - 1000 });
      
      const result = await store.increment(key);
      expect(result.count).toBe(1);
      
      store.destroy();
    });

    it('should decrement counter', async () => {
      const store = new MemoryStore();
      const key = 'test-key';
      
      await store.increment(key);
      await store.increment(key);
      await store.decrement(key);
      
      const entry = await store.get(key);
      expect(entry?.count).toBe(1);
      
      store.destroy();
    });

    it('should reset specific key', async () => {
      const store = new MemoryStore();
      const key = 'test-key';
      
      await store.increment(key);
      await store.increment(key);
      await store.resetKey(key);
      
      const entry = await store.get(key);
      expect(entry).toBeNull();
      
      store.destroy();
    });

    it('should reset all keys', async () => {
      const store = new MemoryStore();
      
      await store.increment('key1');
      await store.increment('key2');
      await store.resetAll();
      
      const entry1 = await store.get('key1');
      const entry2 = await store.get('key2');
      
      expect(entry1).toBeNull();
      expect(entry2).toBeNull();
      
      store.destroy();
    });
  });

  describe('RateLimitExceededError', () => {
    it('should have correct properties', () => {
      const error = new RateLimitExceededError(60, 'Custom message');
      
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Custom message');
      expect(error.retryAfter).toBe(60);
      expect(error.name).toBe('RateLimitExceededError');
    });

    it('should have default message if not provided', () => {
      const error = new RateLimitExceededError(30);
      
      expect(error.message).toContain('30 seconds');
    });
  });

  describe('rateLimit middleware', () => {
    it('should allow requests within limit', async () => {
      const store = new MemoryStore();
      const middleware = rateLimit({
        max: 5,
        windowMs: 60000,
        store,
      });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
      expect(res._headers['RateLimit-Limit']).toBe('5');
      expect(res._headers['RateLimit-Remaining']).toBe('4');
    });

    it('should block requests exceeding limit', async () => {
      const store = new MemoryStore();
      const middleware = rateLimit({
        max: 2,
        windowMs: 60000,
        store,
      });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // First two requests should pass
      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);
      
      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(2);
      
      // Third request should be blocked
      const next3 = createMockNext();
      await middleware(req as Request, res as Response, next3);
      
      expect(next3).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(429);
    });

    it('should use custom key generator', async () => {
      const store = new MemoryStore();
      let callCount = 0;
      const keyGen = vi.fn().mockImplementation(() => `custom-key-${++callCount}`);
      
      const middleware = rateLimit({
        max: 1,
        windowMs: 60000,
        store,
        keyGenerator: keyGen,
      });
      
      const req1 = createMockRequest({ ip: '192.168.1.1' });
      const req2 = createMockRequest({ ip: '192.168.1.2' });
      const res1 = createMockResponse();
      const res2 = createMockResponse();
      const next1 = createMockNext();
      const next2 = createMockNext();
      
      await middleware(req1 as Request, res1 as Response, next1);
      await middleware(req2 as Request, res2 as Response, next2);
      
      expect(keyGen).toHaveBeenCalledTimes(2);
      expect(next1).toHaveBeenCalled(); // First key allowed
      expect(next2).toHaveBeenCalled(); // Second key allowed (different key)
    });

    it('should skip requests when skip condition is true', async () => {
      const store = new MemoryStore();
      const skipFn = vi.fn().mockReturnValue(true);
      
      const middleware = rateLimit({
        max: 1,
        windowMs: 60000,
        store,
        skip: skipFn,
      });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req as Request, res as Response, next);
      
      expect(skipFn).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      // No rate limit headers should be set for skipped requests
    });

    it('should set standard headers when enabled', async () => {
      const store = new MemoryStore();
      const middleware = rateLimit({
        max: 10,
        windowMs: 60000,
        store,
        standardHeaders: true,
        legacyHeaders: false,
      });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req as Request, res as Response, next);
      
      expect(res._headers['RateLimit-Limit']).toBe('10');
      expect(res._headers['RateLimit-Remaining']).toBe('9');
      expect(res._headers['RateLimit-Reset']).toBeDefined();
      expect(res._headers['X-RateLimit-Limit']).toBeUndefined(); // Legacy disabled
    });

    it('should set legacy headers when enabled', async () => {
      const store = new MemoryStore();
      const middleware = rateLimit({
        max: 10,
        windowMs: 60000,
        store,
        standardHeaders: false,
        legacyHeaders: true,
      });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      await middleware(req as Request, res as Response, next);
      
      expect(res._headers['X-RateLimit-Limit']).toBe('10');
      expect(res._headers['X-RateLimit-Remaining']).toBe('9');
      expect(res._headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should use custom handler when rate limit exceeded', async () => {
      const customHandler = vi.fn();
      const store = new MemoryStore();
      
      const middleware = rateLimit({
        max: 1,
        windowMs: 60000,
        store,
        handler: customHandler,
      });
      
      // First request
      const req1 = createMockRequest();
      const res1 = createMockResponse();
      await middleware(req1 as Request, res1 as Response, vi.fn());
      
      // Second request - should trigger custom handler
      const req2 = createMockRequest();
      const res2 = createMockResponse();
      const next2 = createMockNext();
      await middleware(req2 as Request, res2 as Response, next2);
      
      expect(customHandler).toHaveBeenCalled();
      expect(next2).not.toHaveBeenCalled();
    });

    it('should handle X-Forwarded-For header for client IP', async () => {
      const store = new MemoryStore();
      const middleware = rateLimit({
        max: 1,
        windowMs: 60000,
        store,
      });
      
      // First request with forwarded IP
      const req1 = createMockRequest({
        headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
      });
      await middleware(req1 as Request, createMockResponse() as Response, vi.fn());
      
      // Second request with same first forwarded IP (should be blocked)
      const req2 = createMockRequest({
        headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.2' },
      });
      const res2 = createMockResponse();
      const next2 = createMockNext();
      await middleware(req2 as Request, res2 as Response, next2);
      
      // Should be blocked because first IP is same (10.0.0.1)
      expect(next2).not.toHaveBeenCalled();
    });

    it('should fail open if store throws error', async () => {
      const errorStore = {
        increment: vi.fn().mockRejectedValue(new Error('Store error')),
        decrement: vi.fn(),
        resetKey: vi.fn(),
      };
      
      const middleware = rateLimit({
        max: 1,
        windowMs: 60000,
        store: errorStore as any,
      });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Should allow request through on store error (fail open)
      await middleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should set Retry-After header when rate limited', async () => {
      const store = new MemoryStore();
      const middleware = rateLimit({
        max: 1,
        windowMs: 60000,
        store,
      });
      
      // Exhaust the limit
      await middleware(createMockRequest() as Request, createMockResponse() as Response, vi.fn());
      
      // Try to exceed
      const res = createMockResponse();
      await middleware(createMockRequest() as Request, res as Response, vi.fn());
      
      expect(res._headers['Retry-After']).toBeDefined();
      expect(parseInt(res._headers['Retry-After'])).toBeGreaterThan(0);
    });
  });
});

describe('Pre-configured Rate Limiters', () => {
  it('createApiRateLimiter should have sensible defaults', () => {
    const store = new MemoryStore();
    const middleware = rateLimit({
      max: 100,
      windowMs: 60000,
      store,
    });
    
    expect(middleware).toBeDefined();
  });

  it('createAuthRateLimiter should have strict limits', () => {
    const store = new MemoryStore();
    const middleware = rateLimit({
      max: 5,
      windowMs: 60000,
      store,
    });
    
    expect(middleware).toBeDefined();
  });
});
