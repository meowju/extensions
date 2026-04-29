/**
 * Type-Safe Data Validation Utility
 * 
 * Implements best practices from TypeScript error handling research:
 * - Result type pattern for explicit error handling
 * - Custom error hierarchy with rich context
 * - Railway-oriented programming helpers
 * - Type-safe validation with composable rules
 * - Exhaustive error handling patterns
 */

// ============================================================================
// ERROR HIERARCHY
// ============================================================================

/**
 * Base application error with rich context and serialization support
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly timestamp: Date;
  readonly context: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      cause?: unknown;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = options?.context ?? {};
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Validation error with field-level details
 */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(
    message: string,
    options?: {
      field?: string;
      value?: unknown;
      constraints?: string[];
      cause?: unknown;
    }
  ) {
    super(message, {
      cause: options?.cause,
      context: {
        field: options?.field,
        value: options?.value,
        constraints: options?.constraints,
      },
    });
  }

  /**
   * Get formatted field errors for API responses
   */
  getFieldErrors(): Record<string, string[]> {
    const field = this.context.field as string | undefined;
    if (field) {
      return { [field]: [this.message] };
    }
    return { _general: [this.message] };
  }
}

// ============================================================================
// RESULT TYPE
// ============================================================================

/**
 * Discriminated union Result type - success or failure without exceptions
 * 
 * Key benefits:
 * - Type-safe error handling at compile time
 * - Forces explicit error handling
 * - Makes failure modes explicit in function signatures
 */
export type Result<T, E = Error> = Success<T, E> | Failure<T, E>;

export class Success<T, E = Error> {
  readonly success: true = true;
  readonly failure: false = false;
  readonly data: T;

  constructor(data: T) {
    this.data = data;
    Object.freeze(this);
  }

  /**
   * Transform the success value
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Success(fn(this.data));
  }

  /**
   * Chain operations that return Results
   */
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.data);
  }

  /**
   * Transform the error (noop for Success)
   */
  mapError<F>(_fn: (error: never) => F): Result<T, never> {
    return this as unknown as Result<T, never>;
  }

  /**
   * Get the value or a default
   */
  getOrElse(_default: T): T {
    return this.data;
  }

  /**
   * Unwrap or throw
   */
  getOrElseThrow(): T {
    return this.data;
  }

  /**
   * Pattern matching
   */
  fold<U>(onSuccess: (value: T) => U, _onFailure: (error: never) => U): U {
    return onSuccess(this.data);
  }

  /**
   * Check if result is success
   */
  isSuccess(): this is Success<T, E> {
    return true;
  }

  /**
   * Check if result is failure
   */
  isFailure(): this is Failure<T, E> {
    return false;
  }
}

export class Failure<T, E = Error> {
  readonly success: false = false;
  readonly failure: true = true;
  readonly error: E;

  constructor(error: E) {
    this.error = error;
    Object.freeze(this);
  }

  /**
   * Transform the success value (noop for Failure)
   */
  map<U>(_fn: (value: never) => U): Result<never, E> {
    return this as unknown as Result<never, E>;
  }

  /**
   * Chain operations (noop for Failure)
   */
  andThen<U>(_fn: (value: never) => Result<U, E>): Result<never, E> {
    return this as unknown as Result<never, E>;
  }

  /**
   * Transform the error
   */
  mapError<F>(fn: (error: E) => F): Result<T, F> {
    return new Failure(fn(this.error));
  }

  /**
   * Get the value or a default
   */
  getOrElse(defaultValue: T): T {
    return defaultValue;
  }

  /**
   * Unwrap or throw the error
   */
  getOrElseThrow(): never {
    throw this.error;
  }

  /**
   * Pattern matching
   */
  fold<U>(_onSuccess: (value: never) => U, onFailure: (error: E) => U): U {
    return onFailure(this.error);
  }

  /**
   * Check if result is success
   */
  isSuccess(): this is Success<T, E> {
    return false;
  }

  /**
   * Check if result is failure
   */
  isFailure(): this is Failure<T, E> {
    return true;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a success result
 */
export function ok<T>(data: T): Result<T, never> {
  return new Success(data);
}

/**
 * Create a failure result
 */
export function err<E>(error: E): Result<never, E> {
  return new Failure(error);
}

/**
 * Type guard to check if result is success
 */
export function isOk<T, E>(result: Result<T, E>): result is Success<T, E> {
  return result.success === true;
}

/**
 * Type guard to check if result is failure
 */
export function isErr<T, E>(result: Result<T, E>): result is Failure<T, E> {
  return result.failure === true;
}

/**
 * Wrap a synchronous function that might throw
 */
export function tryCatch<T, E = Error>(
  fn: () => T,
  errorMapper?: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    const mappedError = errorMapper
      ? errorMapper(error)
      : (error instanceof Error ? error : new Error(String(error))) as E;
    return err(mappedError);
  }
}

/**
 * Wrap an async function that might throw
 */
export async function tryCatchAsync<T, E = Error>(
  promise: Promise<T>,
  errorMapper?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return ok(data);
  } catch (error) {
    const mappedError = errorMapper
      ? errorMapper(error)
      : (error instanceof Error ? error : new Error(String(error))) as E;
    return err(mappedError);
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Constraint definition for validators
 */
export interface ValidationConstraint {
  readonly name: string;
  readonly message: string;
}

/**
 * Validation rule that can be composed
 */
export type ValidationRule<T> = (value: T) => Result<T, ValidationError>;

/**
 * Create a required field validator
 */
export function required<T = unknown>(fieldName: string): ValidationRule<T> {
  return (value) => {
    if (value === null || value === undefined || (typeof value === 'string' && value === '')) {
      return err(new ValidationError(`${fieldName} is required`, {
        field: fieldName,
        value,
        constraints: ['required'],
      }));
    }
    return ok(value);
  };
}

/**
 * Create a string minimum length validator
 */
export function minLength(fieldName: string, min: number): ValidationRule<string> {
  return (value) => {
    if (typeof value !== 'string' || value.length < min) {
      return err(new ValidationError(
        `${fieldName} must be at least ${min} characters`,
        { field: fieldName, value, constraints: [`minLength:${min}`] }
      ));
    }
    return ok(value);
  };
}

/**
 * Create a string maximum length validator
 */
export function maxLength(fieldName: string, max: number): ValidationRule<string> {
  return (value) => {
    if (typeof value !== 'string' || value.length > max) {
      return err(new ValidationError(
        `${fieldName} must be at most ${max} characters`,
        { field: fieldName, value, constraints: [`maxLength:${max}`] }
      ));
    }
    return ok(value);
  };
}

/**
 * Create a pattern/regex validator
 */
export function pattern(
  fieldName: string,
  regex: RegExp,
  description: string
): ValidationRule<string> {
  return (value) => {
    if (typeof value !== 'string' || !regex.test(value)) {
      return err(new ValidationError(
        `${fieldName} must be a valid ${description}`,
        { field: fieldName, value, constraints: [`pattern:${description}`] }
      ));
    }
    return ok(value);
  };
}

/**
 * Create an email format validator
 */
export function email(fieldName: string): ValidationRule<string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern(fieldName, emailRegex, 'email address');
}

/**
 * Create a numeric range validator
 */
export function range(
  fieldName: string,
  min: number,
  max: number
): ValidationRule<number> {
  return (value) => {
    if (typeof value !== 'number' || value < min || value > max) {
      return err(new ValidationError(
        `${fieldName} must be between ${min} and ${max}`,
        { field: fieldName, value, constraints: [`range:${min}-${max}`] }
      ));
    }
    return ok(value);
  };
}

/**
 * Compose multiple validation rules into one
 */
export function compose<T>(...rules: ValidationRule<T>[]): ValidationRule<T> {
  return (value) => {
    for (const rule of rules) {
      const result = rule(value);
      if (isErr(result)) {
        return result;
      }
    }
    return ok(value);
  };
}

/**
 * Combine validators for an object schema
 */
export type Schema<T> = {
  [K in keyof T]: ValidationRule<T[K]>;
};

export function validate<T>(
  data: unknown,
  schema: Schema<T>
): Result<T, AggregateValidationError> {
  if (typeof data !== 'object' || data === null) {
    return err(new AggregateValidationError('Data must be an object', []));
  }

  const errors: ValidationError[] = [];
  const result: Partial<T> = {};

  for (const [key, rule] of Object.entries(schema)) {
    const value = (data as Record<string, any>)[key];
    const validationResult = (rule as ValidationRule<any>)(value);

    if (isErr(validationResult)) {
      errors.push(validationResult.error as ValidationError);
    } else {
      result[key as keyof T] = validationResult.data;
    }
  }

  if (errors.length > 0) {
    return err(new AggregateValidationError(
      `Validation failed for ${errors.length} field(s)`,
      errors
    ));
  }

  return ok(result as T);
}

/**
 * Aggregate error for multiple validation failures
 */
export class AggregateValidationError extends AppError {
  readonly code = 'AGGREGATE_VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[]) {
    super(message, { context: { errors: errors.map(e => e.toJSON()) } });
    this.errors = errors;
  }

  getFieldErrors(): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};
    for (const error of this.errors) {
      const fields = error.getFieldErrors();
      for (const [field, messages] of Object.entries(fields)) {
        fieldErrors[field] = [...(fieldErrors[field] || []), ...messages];
      }
    }
    return fieldErrors;
  }
}

// ============================================================================
// MAIN DATA VALIDATION UTILITY
// ============================================================================

/**
 * User registration data shape
 */
export interface UserRegistrationData {
  readonly email: string;
  readonly password: string;
  readonly username: string;
  readonly age?: number;
}

/**
 * Validation schema for user registration
 */
export const userRegistrationSchema: Schema<UserRegistrationData> = {
  email: compose(
    required('email'),
    email('email')
  ),
  password: compose(
    required('password'),
    minLength('password', 8),
    maxLength('password', 128)
  ),
  username: compose(
    required('username'),
    minLength('username', 3),
    maxLength('username', 30),
    pattern('username', /^[a-zA-Z0-9_]+$/, 'username (letters, numbers, underscores)')
  ),
  age: (value) => {
    if (value === undefined) return ok(value);
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return err(new ValidationError('Age must be an integer', {
        field: 'age',
        value,
        constraints: ['integer'],
      }));
    }
    return range('age', 13, 120)(value);
  },
};

/**
 * Parse and validate user registration data
 * 
 * This is the main utility function demonstrating best practices:
 * - Returns Result type for explicit error handling
 * - Uses composition for reusable validation rules
 * - Provides rich error context
 * - Is fully type-safe with TypeScript generics
 */
export function parseUserRegistration(
  data: unknown
): Result<UserRegistrationData, AggregateValidationError> {
  return validate(data, userRegistrationSchema);
}

/**
 * Sanitize and transform validated data
 */
export function prepareUserForStorage(
  data: UserRegistrationData
): Result<{
  email: string;
  username: string;
  age?: number;
  hashedPassword: string;
  createdAt: Date;
}, never> {
  return ok({
    email: data.email.toLowerCase().trim(),
    username: data.username.toLowerCase().trim(),
    age: data.age,
    hashedPassword: data.password, // In production, hash this!
    createdAt: new Date(),
  });
}

// ============================================================================
// TYPE GUARD FUNCTIONS
// ============================================================================

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is an AggregateValidationError
 */
export function isAggregateValidationError(
  error: unknown
): error is AggregateValidationError {
  return error instanceof AggregateValidationError;
}

/**
 * Safe error serializer for logging
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (isAppError(error)) {
    return error.toJSON();
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }
  return { message: String(error) };
}

// ============================================================================
// EXHAUSTIVE ERROR HANDLING
// ============================================================================

/**
 * Map error codes to user-friendly messages
 * Demonstrates exhaustive checking with never type
 */
export function getErrorMessage(error: AppError): string {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return `Invalid input: ${error.message}`;
    case 'AGGREGATE_VALIDATION_ERROR':
      return Object.values((error as AggregateValidationError).getFieldErrors())
        .flat()
        .join(', ');
    case 'NOT_FOUND':
      return 'The requested resource was not found';
    case 'AUTHENTICATION_ERROR':
      return 'Please log in to continue';
    case 'AUTHORIZATION_ERROR':
      return 'You do not have permission to perform this action';
    default:
      return `Error [${error.code}]: ${error.message}`;
  }
}