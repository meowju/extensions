/**
 * Custom Error Classes and Result Types for TypeScript
 * 
 * Based on research findings for proper TypeScript error handling patterns.
 * Includes:
 * - Base error hierarchy with prototype chain fixes
 * - Result/Tagged Union pattern for expected failures
 * - Aggregate Error support
 * - Serialization support
 * 
 * @see research-report.md
 */

/**
 * Result type for operations that may fail
 * Tagged union pattern - no exceptions for expected failures
 */
export type Result<T, E extends AppError = AppError> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

/**
 * Base application error with proper TypeScript error handling
 * 
 * Implements all best practices:
 * - Calls super() first
 * - Sets this.name to class name
 * - Uses Object.setPrototypeOf() for ES5 compatibility
 * - Uses Error.captureStackTrace() for cleaner stacks
 * - Includes typed properties for programmatic error handling
 */
export class AppError extends Error {
  /** Error code for programmatic handling */
  public readonly code: string;
  /** HTTP status code (defaults to 500) */
  public readonly statusCode: number;
  /** Timestamp when error was created */
  public readonly timestamp: number;
  /** Additional context data */
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      context?: Record<string, unknown>;
    } = {}
  ) {
    const {
      code = 'INTERNAL_ERROR',
      statusCode = 500,
      context,
    } = options;

    // Call super first - required for proper error initialization
    super(message);
    
    // Set name to class name for proper error identification
    this.name = this.constructor.name;
    
    // Store additional properties
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = Date.now();
    this.context = context;

    // Fix prototype chain for ES5 transpilation compatibility
    // This ensures instanceof works correctly across all environments
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture stack trace with this constructor hidden
    // Only available in V8 environments (Node.js, Chrome, Edge)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Check if this error matches a specific code
   */
  isCode(code: string): boolean {
    return this.code === code;
  }

  /**
   * Serialize error to JSON for network/worker transfer
   */
  toJSON(): ErrorJSON {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Reconstruct error from serialized JSON
   */
  static fromJSON<T extends AppError>(
    this: new (message: string, options?: ErrorOptions) => T,
    json: ErrorJSON
  ): T {
    const error = new this(json.message, {
      code: json.code,
      statusCode: json.statusCode,
      context: json.context,
    });
    error.stack = json.stack;
    return error;
  }
}

/** JSON representation of an error */
export interface ErrorOptions {
  code?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
}

/** JSON structure for serialized errors */
export interface ErrorJSON {
  name: string;
  message: string;
  code: string;
  statusCode: number;
  timestamp: number;
  context?: Record<string, unknown>;
  stack?: string;
}

// =============================================================================
// DOMAIN-SPECIFIC ERROR HIERARCHY
// =============================================================================

/**
 * Abstract base for domain-specific errors
 * Uses new.target to properly support inheritance
 */
export abstract class DomainError extends AppError {
  constructor(
    message: string,
    options: ErrorOptions = {}
  ) {
    super(message, options);
    
    // Fix prototype chain using new.target for proper inheritance
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Validation errors - input validation failures
 */
export class ValidationError extends DomainError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    options: {
      field?: string;
      value?: unknown;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      context: {
        ...options.context,
        field: options.field,
        value: options.value,
      },
    });

    this.field = options.field;
    this.value = options.value;
  }
}

/**
 * Not found errors - resource lookup failures
 */
export class NotFoundError extends DomainError {
  public readonly resource: string;
  public readonly resourceId?: string;

  constructor(
    resource: string,
    resourceId?: string
  ) {
    const message = resourceId
      ? `${resource} with id '${resourceId}' not found`
      : `${resource} not found`;

    super(message, {
      code: 'NOT_FOUND',
      statusCode: 404,
      context: { resource, resourceId },
    });

    this.resource = resource;
    this.resourceId = resourceId;
  }
}

/**
 * Authentication errors - auth failures
 */
export class UnauthorizedError extends DomainError {
  constructor(message = 'Authentication required') {
    super(message, {
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }
}

/**
 * Permission errors - forbidden actions
 */
export class ForbiddenError extends DomainError {
  constructor(message = 'Permission denied') {
    super(message, {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }
}

/**
 * Conflict errors - state conflicts
 */
export class ConflictError extends DomainError {
  public readonly conflictingResource?: string;

  constructor(
    message: string,
    conflictingResource?: string
  ) {
    super(message, {
      code: 'CONFLICT',
      statusCode: 409,
      context: conflictingResource ? { conflictingResource } : undefined,
    });

    this.conflictingResource = conflictingResource;
  }
}

/**
 * Rate limit errors - too many requests
 */
export class RateLimitError extends DomainError {
  public readonly retryAfterMs?: number;

  constructor(
    message = 'Too many requests',
    retryAfterMs?: number
  ) {
    super(message, {
      code: 'RATE_LIMITED',
      statusCode: 429,
      context: retryAfterMs ? { retryAfterMs } : undefined,
    });

    this.retryAfterMs = retryAfterMs;
  }
}

// =============================================================================
// AGGREGATE ERROR (TypeScript 4.x+)
// =============================================================================

/**
 * Collects multiple errors into a single error
 * Useful for batch operations where multiple things can fail
 */
export class AggregateError extends Error {
  readonly name = 'AggregateError';
  public readonly errors: readonly Error[];

  constructor(
    errors: Error[],
    message?: string
  ) {
    const defaultMessage = `Encountered ${errors.length} error(s)`;
    super(message ?? defaultMessage);
    
    this.errors = Object.freeze([...errors]);

    // Fix prototype chain
    Object.setPrototypeOf(this, AggregateError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AggregateError);
    }
  }

  /**
   * Iterate over individual errors
   */
  *[Symbol.iterator](): Generator<Error> {
    for (const error of this.errors) {
      yield error;
    }
  }

  /**
   * Get all errors matching a predicate
   */
  filter(predicate: (error: Error) => boolean): Error[] {
    return this.errors.filter(predicate);
  }

  /**
   * Check if any errors match a predicate
   */
  some(predicate: (error: Error) => boolean): boolean {
    return this.errors.some(predicate);
  }
}

// =============================================================================
// RESULT TYPE UTILITIES
// =============================================================================

/**
 * Type guard to narrow Result to success case
 */
export function isSuccess<T, E extends AppError>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to narrow Result to failure case
 */
export function isFailure<T, E extends AppError>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Create a successful result
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failed result
 */
export function err<E extends AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Map over the success value
 */
export function mapResult<T, U, E extends AppError>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if (isSuccess(result)) {
    return ok(fn(result.data));
  }
  return result;
}

/**
 * Map over the error value
 */
export function mapError<T, E extends AppError, F extends AppError>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (isFailure(result)) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Unwrap result or return default value
 */
export function unwrapOr<T, E extends AppError>(result: Result<T, E>, defaultValue: T): T {
  if (isSuccess(result)) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Unwrap result or throw if failed
 */
export function unwrap<T, E extends AppError>(result: Result<T, E>): T {
  if (isSuccess(result)) {
    return result.data;
  }
  throw result.error;
}

/**
 * Unwrap error or throw if success
 */
export function unwrapError<T, E extends AppError>(result: Result<T, E>): E {
  if (isFailure(result)) {
    return result.error;
  }
  throw new AppError('Expected failure but got success', { code: 'UNWRAP_ERROR' });
}
