/**
 * Request Logging Middleware
 * Comprehensive request/response logging with metrics
 */

import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Types
// ============================================

export interface RequestLogEntry {
  /** Unique request ID */
  requestId: string;
  /** HTTP method */
  method: string;
  /** Request URL (full path) */
  url: string;
  /** Request path (without query string) */
  path: string;
  /** Query parameters */
  query: Record<string, unknown>;
  /** HTTP version */
  httpVersion: string;
  /** Client IP address */
  ip: string;
  /** User agent string */
  userAgent: string;
  /** Request body (sanitized) */
  body: Record<string, unknown> | null;
  /** Request headers (selected) */
  headers: RequestHeaders;
  /** Request timestamp */
  timestamp: string;
  /** Response status code */
  statusCode?: number;
  /** Response body size in bytes */
  contentLength?: number;
  /** Time taken to process in milliseconds */
  duration?: number;
  /** Error message if any */
  error?: string;
  /** Authenticated user ID if any */
  userId?: string;
  /** Session ID if any */
  sessionId?: string;
}

export interface RequestHeaders {
  host?: string;
  contentType?: string;
  userAgent?: string;
  accept?: string;
  authorization?: string; // Will be redacted
  referer?: string;
  origin?: string;
}

export interface LogOptions {
  /** Include request body in logs */
  logBody?: boolean;
  /** Include response body in logs */
  logResponse?: boolean;
  /** Fields to exclude from body logging (e.g., passwords) */
  excludeBodyFields?: string[];
  /** Fields to mask in logs (e.g., credit card numbers) */
  maskFields?: string[];
  /** Log level based on status code */
  logLevelByStatus?: Record<string, 'error' | 'warn' | 'info' | 'debug'>;
  /** Custom logger function */
  logger?: (entry: RequestLogEntry) => void;
  /** Skip logging for certain paths (e.g., health checks) */
  skipPaths?: string[];
  /** Include performance metrics */
  includeMetrics?: boolean;
  /** Include request headers */
  includeHeaders?: boolean;
}

/**
 * Request context stored for the duration of the request
 */
interface RequestContext {
  requestId: string;
  startTime: number;
  logEntry: RequestLogEntry;
}

// ============================================
// Default Options
// ============================================

const DEFAULT_OPTIONS: Required<LogOptions> = {
  logBody: true,
  logResponse: false,
  excludeBodyFields: ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken', 'creditCard', 'ssn'],
  maskFields: ['email', 'phone'],
  logLevelByStatus: {
    '2xx': 'info',
    '3xx': 'debug',
    '4xx': 'warn',
    '5xx': 'error',
  },
  logger: console.log,
  skipPaths: ['/health', '/healthz', '/ready', '/metrics'],
  includeMetrics: true,
  includeHeaders: true,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get client IP from request (handles proxies)
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Extract selected headers from request
 */
function extractHeaders(req: Request, excludeBodyFields: string[]): RequestHeaders {
  const headers: RequestHeaders = {};

  if (req.headers.host) {
    headers.host = req.headers.host;
  }
  if (req.headers['content-type']) {
    headers.contentType = Array.isArray(req.headers['content-type'])
      ? req.headers['content-type'][0]
      : req.headers['content-type'];
  }
  if (req.headers['user-agent']) {
    headers.userAgent = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'][0]
      : req.headers['user-agent'];
  }
  if (req.headers.accept) {
    headers.accept = Array.isArray(req.headers.accept)
      ? req.headers.accept[0]
      : req.headers.accept;
  }
  if (req.headers.authorization) {
    // Redact authorization header
    headers.authorization = '[REDACTED]';
  }
  if (req.headers.referer) {
    headers.referer = Array.isArray(req.headers.referer)
      ? req.headers.referer[0]
      : req.headers.referer;
  }
  if (req.headers.origin) {
    headers.origin = Array.isArray(req.headers.origin)
      ? req.headers.origin[0]
      : req.headers.origin;
  }

  return headers;
}

/**
 * Sanitize body by removing sensitive fields and masking others
 */
function sanitizeBody(
  body: Record<string, unknown> | null,
  excludeFields: string[],
  maskFields: string[]
): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    // Check if field should be excluded
    const lowerKey = key.toLowerCase();
    if (excludeFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeBody(value as Record<string, unknown>, excludeFields, maskFields);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeBody(item as Record<string, unknown>, excludeFields, maskFields)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Mask sensitive data patterns
 */
function maskValue(value: unknown, fieldName: string, maskFields: string[]): unknown {
  const lowerFieldName = fieldName.toLowerCase();
  
  // Check if this field should be masked
  const shouldMask = maskFields.some(mask => lowerFieldName.includes(mask.toLowerCase()));

  if (!shouldMask || typeof value !== 'string') {
    return value;
  }

  const str = value as string;

  // Mask email addresses
  if (str.includes('@')) {
    const [local, domain] = str.split('@');
    if (local.length > 2) {
      return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
    }
    return `***@${domain}`;
  }

  // Mask phone numbers
  if (/^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/.test(str)) {
    return '***-***-' + str.slice(-4);
  }

  // Default: mask middle characters
  if (str.length > 4) {
    return str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2);
  }

  return '****';
}

/**
 * Determine log level based on status code
 */
function getLogLevel(statusCode: number | undefined, levels: Record<string, 'error' | 'warn' | 'info' | 'debug'>): 'error' | 'warn' | 'info' | 'debug' {
  if (!statusCode) return 'debug';

  if (statusCode >= 500) return levels['5xx'] || 'error';
  if (statusCode >= 400) return levels['4xx'] || 'warn';
  if (statusCode >= 300) return levels['3xx'] || 'debug';
  return levels['2xx'] || 'info';
}

/**
 * Generate a short request ID
 */
function generateRequestId(): string {
  // Use UUID v4 but take first 8 characters for readability
  return uuidv4().replace(/-/g, '').slice(0, 8);
}

// ============================================
// Middleware Factory
// ============================================

/**
 * Create request logging middleware
 * @param options Configuration options
 */
export function createRequestLogger(options: LogOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip logging for excluded paths
    if (opts.skipPaths.some(skipPath => req.path === skipPath || req.path.startsWith(skipPath + '/'))) {
      next();
      return;
    }

    // Generate request ID
    const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
    
    // Record start time
    const startTime = Date.now();

    // Create initial log entry
    const logEntry: RequestLogEntry = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      query: req.query as Record<string, unknown>,
      httpVersion: req.httpVersion,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      body: opts.logBody ? sanitizeBody(req.body as Record<string, unknown>, opts.excludeBodyFields, opts.maskFields) : null,
      headers: opts.includeHeaders ? extractHeaders(req, opts.excludeBodyFields) : {} as RequestHeaders,
      timestamp: new Date().toISOString(),
    };

    // Attach request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    // Add user ID if authenticated
    if ((req as any).user?.id) {
      logEntry.userId = (req as any).user.id;
    }

    // Add session ID if available
    if ((req as any).sessionID) {
      logEntry.sessionId = (req as any).sessionID;
    }

    // Store context on request for access in route handlers
    (req as any).requestId = requestId;
    (req as any).requestLog = (data: Partial<RequestLogEntry>) => {
      Object.assign(logEntry, data);
    };

    // Hook into response finish
    const originalEnd = res.end;
    res.end = function(this: Response, ...args: Parameters<Response['end']>): ReturnType<Response['end']> {
      // Calculate duration
      const duration = Date.now() - startTime;
      logEntry.duration = duration;
      logEntry.statusCode = res.statusCode;
      logEntry.contentLength = parseInt(res.getHeader('Content-Length') as string) || 0;

      // Determine log level and log
      const level = getLogLevel(res.statusCode, opts.logLevelByStatus);
      
      // Add error info if present
      if (res.statusCode >= 400) {
        const error = (req as any).error;
        if (error) {
          logEntry.error = error instanceof Error ? error.message : String(error);
        }
      }

      // Call custom logger or default
      opts.logger(logEntry);

      // Console output with level
      const logMessage = `[${level.toUpperCase()}] ${requestId} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
      
      switch (level) {
        case 'error':
          console.error(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        case 'debug':
          console.debug(logMessage);
          break;
        default:
          console.log(logMessage);
      }

      return originalEnd.apply(this, args as any);
    };

    next();
  };
}

// ============================================
// Pre-configured Loggers
// ============================================

/**
 * Minimal logger for production - logs essential info only
 */
export const minimalLogger = createRequestLogger({
  logBody: false,
  includeHeaders: false,
  skipPaths: ['/health', '/healthz', '/ready', '/metrics', '/favicon.ico'],
});

/**
 * Detailed logger for development
 */
export const detailedLogger = createRequestLogger({
  logBody: true,
  logResponse: false,
  includeHeaders: true,
  logLevelByStatus: {
    '2xx': 'info',
    '3xx': 'debug',
    '4xx': 'warn',
    '5xx': 'error',
  },
});

/**
 * JSON logger for structured logging (production)
 */
export const jsonLogger = createRequestLogger({
  logger: (entry) => {
    console.log(JSON.stringify(entry));
  },
  logBody: true,
  skipPaths: ['/health', '/healthz', '/ready'],
});

// ============================================
// Express Integration Helpers
// ============================================

/**
 * Add request ID to request object
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  next();
}

/**
 * Get request ID from request
 */
export function getRequestId(req: Request): string {
  return req.requestId || (req as any).requestId || 'unknown';
}

/**
 * Create structured log entry helper for use in route handlers
 */
export function createStructuredLog(req: Request, data: Partial<RequestLogEntry>): void {
  const logger = (req as any).requestLog;
  if (logger) {
    logger(data);
  }
}

// ============================================
// Express Request Type Augmentation
// ============================================

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
