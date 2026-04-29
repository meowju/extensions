/**
 * HTTP Response Utilities
 * Standardized response formatting and helpers
 */

/**
 * Standard success response wrapper
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * List response with pagination
 */
export interface ListResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Create a success response
 */
export function success<T>(data: T, meta?: Record<string, unknown>): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Create an error response
 */
export function error(
  code: string,
  message: string,
  details?: unknown,
  requestId?: string
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(requestId && { requestId }),
    },
  };
}

/**
 * Create a paginated list response
 */
export function paginated<T>(
  data: T[],
  pagination: Omit<PaginationMeta, 'hasNext' | 'hasPrev'> & { page: number; limit: number; total: number; totalPages: number }
): ListResponse<T> {
  return {
    data,
    pagination: {
      ...pagination,
      hasNext: pagination.page < pagination.totalPages,
      hasPrev: pagination.page > 1,
    },
  };
}

/**
 * HTTP Status codes
 */
export const StatusCode = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

/**
 * Error codes enumeration
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
} as const;

/**
 * Content types
 */
export const ContentType = {
  JSON: 'application/json',
  XML: 'application/xml',
  TEXT: 'text/plain',
} as const;

/**
 * Create standard headers object
 */
export function jsonHeaders(requestId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': ContentType.JSON,
  };
  
  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }
  
  return headers;
}

/**
 * Generate a simple request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Create response with CORS headers
 */
export function corsHeaders(origin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Location header helper for created resources
 */
export function locationHeader(url: string): Record<string, string> {
  return {
    Location: url,
  };
}

/**
 * Parse pagination from query string
 */
export function parsePagination(
  query: Record<string, string | undefined>
): { page: number; limit: number } {
  const page = Math.max(1, parseInt(query.page as string ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string ?? '10', 10) || 10));
  
  return { page, limit };
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Extract JSON body from request (for Bun/Node compatibility)
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    
    if (!contentType.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }
    
    const text = await request.text();
    
    if (!text.trim()) {
      throw new Error('Request body is empty');
    }
    
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid JSON in request body');
    }
    throw err;
  }
}

/**
 * Validate required fields in an object
 */
export function requireFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): string[] {
  const missing: string[] = [];
  
  for (const field of fields) {
    const value = obj[field];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }
  
  return missing;
}

/**
 * Sanitize object for logging (remove sensitive fields)
 */
export function sanitizeForLogging(obj: Record<string, unknown>, sensitiveFields: string[] = ['password', 'token', 'secret', 'key']): Record<string, unknown> {
  const sanitized = { ...obj };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Parse boolean query param
 */
export function parseBoolean(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Parse comma-separated string to array
 */
export function parseArray(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Pick only allowed fields from object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Omit forbidden fields from object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  
  for (const key of keys) {
    delete result[key];
  }
  
  return result as Omit<T, K>;
}