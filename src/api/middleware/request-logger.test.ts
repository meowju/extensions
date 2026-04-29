/**
 * Request Logger Middleware Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { 
  createRequestLogger, 
  minimalLogger, 
  detailedLogger,
  requestIdMiddleware,
  getRequestId,
  createStructuredLog,
} from './request-logger.js';

// Mock Request factory
function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    method: 'GET',
    path: '/api/test',
    originalUrl: '/api/test?foo=bar',
    query: { foo: 'bar' },
    httpVersion: '1.1',
    ip: '192.168.1.1',
    headers: {
      'user-agent': 'Test Agent',
      'content-type': 'application/json',
      'x-request-id': 'test-request-id',
      'x-forwarded-for': '10.0.0.1',
    },
    body: { name: 'test', password: 'secret123' },
    socket: { remoteAddress: '192.168.1.1' } as any,
    ...overrides,
  };
}

// Mock Response factory
function createMockResponse(): Partial<Response> & { 
  statusCode: number; 
  _headers: Record<string, string>;
  _ended: boolean;
} {
  const headers: Record<string, string> = {};
  let ended = false;
  
  return {
    statusCode: 200,
    _headers: headers,
    _ended: ended,
    setHeader: (name: string, value: string | number) => {
      headers[name] = String(value);
      return headers as any;
    },
    getHeader: (name: string) => headers[name],
    get headers() {
      return headers;
    },
    status: function(this: any, code: number) {
      this.statusCode = code;
      return this;
    },
    json: function(this: any, data: any) {
      this._body = data;
      return this;
    },
    end: function(this: any, ...args: any[]) {
      ended = true;
      this._ended = true;
      return this;
    },
    on: vi.fn((event: string, cb: Function) => {
      if (event === 'finish') {
        // Store callback for manual triggering in tests
        (this as any)._finishCallback = cb;
      }
      return this;
    }),
    emit: function(event: string) {
      if (event === 'finish' && (this as any)._finishCallback) {
        (this as any)._finishCallback();
      }
      return true;
    },
  } as any;
}

// Spy on console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('Request Logger Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestIdMiddleware', () => {
    it('should generate request ID if not provided', () => {
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();
      const next = vi.fn();

      requestIdMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.requestId).toBeDefined();
      expect(req.requestId).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should use existing request ID from header', () => {
      const req = createMockRequest({ headers: { 'x-request-id': 'existing-id' } });
      const res = createMockResponse();
      const next = vi.fn();

      requestIdMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.requestId).toBe('existing-id');
    });
  });

  describe('getRequestId', () => {
    it('should return request ID from request object', () => {
      const req = createMockRequest() as any;
      req.requestId = 'custom-id';

      expect(getRequestId(req as Request)).toBe('custom-id');
    });

    it('should return unknown if no request ID', () => {
      const req = createMockRequest({ headers: {} }) as any;

      expect(getRequestId(req as Request)).toBe('unknown');
    });
  });

  describe('createStructuredLog', () => {
    it('should add data to log entry', () => {
      const req = createMockRequest();
      const customLogger = vi.fn();
      
      (req as any).requestLog = customLogger;
      
      createStructuredLog(req as Request, { userId: 'user-123' });
      
      expect(customLogger).toHaveBeenCalledWith({ userId: 'user-123' });
    });
  });

  describe('createRequestLogger', () => {
    it('should log request and response with default options', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ logger: customLogger });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
      expect(res._headers['X-Request-ID']).toBeDefined();
      
      // Simulate response finish
      res.emit('finish');
      
      expect(customLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/api/test?foo=bar',
          path: '/api/test',
        })
      );
    });

    it('should skip logging for health check paths', () => {
      const middleware = createRequestLogger();
      const next = vi.fn();
      
      const req = createMockRequest({ path: '/health' });
      const res = createMockResponse();
      
      middleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
      // No X-Request-ID header set for skipped paths
    });

    it('should sanitize sensitive fields in request body', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ 
        logger: customLogger,
        logBody: true,
        excludeBodyFields: ['password', 'token'],
      });
      
      const req = createMockRequest({ 
        body: { 
          username: 'john',
          password: 'secret',
          accessToken: 'jwt-token',
        }
      });
      const res = createMockResponse();
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      res.emit('finish');
      
      const logEntry = customLogger.mock.calls[0][0];
      
      expect(logEntry.body.username).toBe('john');
      expect(logEntry.body.password).toBe('[REDACTED]');
      expect(logEntry.body.accessToken).toBe('[REDACTED]');
    });

    it('should not log body when logBody is false', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ 
        logger: customLogger,
        logBody: false,
      });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      res.emit('finish');
      
      const logEntry = customLogger.mock.calls[0][0];
      
      expect(logEntry.body).toBeNull();
    });

    it('should capture duration and status code', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ logger: customLogger });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      
      // Simulate async processing delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Manually trigger finish
      res.statusCode = 200;
      res.emit('finish');
      
      const logEntry = customLogger.mock.calls[0][0];
      
      expect(logEntry.statusCode).toBe(200);
      expect(logEntry.duration).toBeDefined();
      expect(typeof logEntry.duration).toBe('number');
    });

    it('should extract user ID from authenticated request', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ logger: customLogger });
      
      const req = createMockRequest() as any;
      req.user = { id: 'user-123', email: 'test@example.com' };
      
      const res = createMockResponse();
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      res.emit('finish');
      
      const logEntry = customLogger.mock.calls[0][0];
      
      expect(logEntry.userId).toBe('user-123');
    });

    it('should handle client IP from X-Forwarded-For header', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ logger: customLogger });
      
      const req = createMockRequest({
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': '10.0.0.1, 192.168.1.1',
        }
      });
      const res = createMockResponse();
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      res.emit('finish');
      
      const logEntry = customLogger.mock.calls[0][0];
      
      expect(logEntry.ip).toBe('10.0.0.1');
    });

    it('should include request headers when includeHeaders is true', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ 
        logger: customLogger,
        includeHeaders: true,
      });
      
      const req = createMockRequest({
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Test Agent',
        }
      });
      const res = createMockResponse();
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      res.emit('finish');
      
      const logEntry = customLogger.mock.calls[0][0];
      
      expect(logEntry.headers.contentType).toBe('application/json');
      expect(logEntry.headers.userAgent).toBe('Test Agent');
    });

    it('should redact authorization header', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ 
        logger: customLogger,
        includeHeaders: true,
      });
      
      const req = createMockRequest({
        headers: {
          'authorization': 'Bearer secret-token',
        }
      });
      const res = createMockResponse();
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      res.emit('finish');
      
      const logEntry = customLogger.mock.calls[0][0];
      
      expect(logEntry.headers.authorization).toBe('[REDACTED]');
    });
  });

  describe('minimalLogger', () => {
    it('should not include body or headers', () => {
      const next = vi.fn();
      
      minimalLogger(createMockRequest() as Request, createMockResponse() as Response, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('detailedLogger', () => {
    it('should include all details', () => {
      const next = vi.fn();
      
      detailedLogger(createMockRequest() as Request, createMockResponse() as Response, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Log Level Assignment', () => {
    it('should log 2xx responses at info level', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ logger: customLogger });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      res.statusCode = 200;
      res.emit('finish');
      
      // Console output should include [INFO]
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
    });

    it('should log 4xx responses at warn level', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ logger: customLogger });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      res.statusCode = 404;
      res.emit('finish');
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]')
      );
    });

    it('should log 5xx responses at error level', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ logger: customLogger });
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      res.statusCode = 500;
      res.emit('finish');
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
    });

    it('should capture error from request if present', async () => {
      const customLogger = vi.fn();
      const middleware = createRequestLogger({ logger: customLogger });
      
      const req = createMockRequest() as any;
      req.error = new Error('Test error');
      
      const res = createMockResponse();
      res.statusCode = 500;
      const next = vi.fn();
      
      middleware(req as Request, res as Response, next);
      res.emit('finish');
      
      const logEntry = customLogger.mock.calls[0][0];
      
      expect(logEntry.error).toBe('Test error');
    });
  });
});
