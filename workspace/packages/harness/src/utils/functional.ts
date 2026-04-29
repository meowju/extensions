/**
 * Functional Composition Utilities
 * 
 * A collection of utilities for composing functions in a functional programming style.
 * Following modern TypeScript best practices:
 * - Strict type checking with generics
 * - JSDoc documentation with examples
 * - Result type pattern for error handling
 * - Railway-oriented programming support
 * 
 * @module functional/pipe
 */

import { Result, Success, Failure, success, failure, tryCatch } from '../result-pattern/src/result';
import { AppError, ValidationError } from '../result-pattern/src/errors';

// ============================================================
// Type Definitions
// ============================================================

/**
 * A type representing any function.
 * Used for generic constraints in composition.
 */
type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Extracts the return type of a function.
 */
type ReturnType<T extends AnyFunction> = T extends (...args: unknown[]) => infer R ? R : never;

/**
 * Extracts the argument types of a function as a tuple.
 */
type ArgumentTypes<T extends AnyFunction> = T extends (...args: infer A) => unknown ? A : never;

/**
 * Options for pipe execution.
 */
export interface PipeOptions {
  /** If true, continue on errors. If false (default), stop and return error. */
  continueOnError?: boolean;
  /** Callback called when an error occurs in the pipeline. */
  onError?: (error: unknown, index: number) => void;
}

// ============================================================
// Pipe Function - Left to Right Composition
// ============================================================

/**
 * Composes functions from left to right.
 * The output of each function becomes the input of the next.
 * 
 * @example
 * ```typescript
 * const addOne = (n: number) => n + 1;
 * const double = (n: number) => n * 2;
 * const toString = (n: number) => String(n);
 * 
 * const pipeline = pipe(addOne, double, toString);
 * pipeline(5); // Returns "(5 + 1) * 2 = 12" -> "12"
 * pipeline(3); // Returns "(3 + 1) * 2 = 8" -> "8"
 * ```
 * 
 * @param fns - The functions to compose
 * @returns A composed function that passes output to input
 */
export function pipe<A, Z>(f1: (a: A) => Z): (a: A) => Z;
export function pipe<A, B, Z>(f1: (a: A) => B, f2: (b: B) => Z): (a: A) => Z;
export function pipe<A, B, C, Z>(f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => Z): (a: A) => Z;
export function pipe<A, B, C, D, Z>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => Z
): (a: A) => Z;
export function pipe<A, B, C, D, E, Z>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => Z
): (a: A) => Z;
export function pipe(...fns: AnyFunction[]): AnyFunction {
  if (fns.length === 0) {
    return (x: unknown) => x;
  }

  if (fns.length === 1) {
    return fns[0];
  }

  return (initial: unknown) => {
    let result = initial;

    for (let i = 0; i < fns.length; i++) {
      const fn = fns[i];
      try {
        result = fn(result);
      } catch (error) {
        throw new ValidationError(
          `Pipe function failed at step ${i + 1}`,
          {
            field: `step_${i + 1}`,
            value: fn.toString(),
            cause: error,
          }
        );
      }
    }

    return result;
  };
}

// ============================================================
// Compose Function - Right to Left Composition
// ============================================================

/**
 * Composes functions from right to left (mathematical notation).
 * Equivalent to `pipe` but with reversed argument order.
 * 
 * @example
 * ```typescript
 * const addOne = (n: number) => n + 1;
 * const double = (n: number) => n * 2;
 * 
 * const pipeline = compose(double, addOne);
 * pipeline(5); // double(addOne(5)) = double(6) = 12
 * ```
 * 
 * @param fns - The functions to compose (right to left)
 * @returns A composed function
 */
export function compose<A, Z>(f1: (a: A) => Z): (a: A) => Z;
export function compose<A, B, Z>(f2: (b: B) => Z, f1: (a: A) => B): (a: A) => Z;
export function compose<A, B, C, Z>(
  f3: (c: C) => Z,
  f2: (b: B) => C,
  f1: (a: A) => B
): (a: A) => Z;
export function compose<A, B, C, D, Z>(
  f4: (d: D) => Z,
  f3: (c: C) => D,
  f2: (b: B) => C,
  f1: (a: A) => B
): (a: A) => Z;
export function compose(...fns: AnyFunction[]): AnyFunction {
  return pipe(...[...fns].reverse());
}

// ============================================================
// Result Pipe - Pipeline with Result Type Support
// ============================================================

/**
 * Composes functions that return Result types.
 * Short-circuits on failure.
 * 
 * @example
 * ```typescript
 * interface User {
 *   name: string;
 *   email: string;
 * }
 * 
 * const parseUser = (data: unknown): Result<User, ValidationError> => { ... };
 * const validateAge = (user: User): Result<User, ValidationError> => { ... };
 * const normalizeUser = (user: User): Result<User, ValidationError> => { ... };
 * 
 * const pipeline = resultPipe(parseUser, validateAge, normalizeUser);
 * const result = pipeline(rawData);
 * 
 * if (result.isFailure) {
 *   console.error(result.error.message);
 * } else {
 *   console.log(result.value);
 * }
 * ```
 * 
 * @param fns - Functions that return Result types
 * @returns A composed function returning a Result
 */
export function resultPipe<T1, E>(
  f1: (a: unknown) => Result<T1, E>
): (a: unknown) => Result<T1, E>;
export function resultPipe<T1, T2, E>(
  f1: (a: unknown) => Result<T1, E>,
  f2: (b: T1) => Result<T2, E>
): (a: unknown) => Result<T2, E>;
export function resultPipe<T1, T2, T3, E>(
  f1: (a: unknown) => Result<T1, E>,
  f2: (b: T1) => Result<T2, E>,
  f3: (c: T2) => Result<T3, E>
): (a: unknown) => Result<T3, E>;
export function resultPipe<T1, T2, T3, T4, E>(
  f1: (a: unknown) => Result<T1, E>,
  f2: (b: T1) => Result<T2, E>,
  f3: (c: T2) => Result<T3, E>,
  f4: (d: T3) => Result<T4, E>
): (a: unknown) => Result<T4, E>;
export function resultPipe<T1, T2, T3, T4, T5, E>(
  f1: (a: unknown) => Result<T1, E>,
  f2: (b: T1) => Result<T2, E>,
  f3: (c: T2) => Result<T3, E>,
  f4: (d: T3) => Result<T4, E>,
  f5: (e: T4) => Result<T5, E>
): (a: unknown) => Result<T5, E>;
export function resultPipe(...fns: AnyFunction[]): AnyFunction {
  if (fns.length === 0) {
    return (x: unknown) => success(x as any);
  }

  return (initial: unknown) => {
    let result: Result<unknown, unknown> = success(initial);

    for (const fn of fns) {
      if (result.isFailure) {
        return result;
      }

      const nextResult = fn(result.value);

      if (nextResult instanceof Failure) {
        return nextResult;
      }

      result = nextResult;
    }

    return result as Result<unknown, unknown>;
  };
}

// ============================================================
// Async Pipe - Pipeline for Async Functions
// ============================================================

/**
 * Composes async functions from left to right.
 * 
 * @example
 * ```typescript
 * const fetchUser = async (id: string) => { ... };
 * const enrichWithPermissions = async (user: User) => { ... };
 * const formatUser = async (user: EnrichedUser) => { ... };
 * 
 * const pipeline = asyncPipe(fetchUser, enrichWithPermissions, formatUser);
 * const result = await pipeline("user-123");
 * ```
 * 
 * @param fns - Async functions to compose
 * @returns A composed async function
 */
export async function asyncPipe<T>(
  initialValue: T,
  ...fns: Array<(value: T) => Promise<T>>
): Promise<T>;
export async function asyncPipe(
  initialValue: unknown,
  ...fns: AnyFunction[]
): Promise<unknown> {
  let result = initialValue;

  for (const fn of fns) {
    result = await (fn as (value: unknown) => Promise<unknown>)(result);
  }

  return result;
}

// ============================================================
// Currying Utilities
// ============================================================

/**
 * Converts a function to curried form.
 * Each argument is applied one at a time.
 * 
 * @example
 * ```typescript
 * const add = (a: number, b: number) => a + b;
 * const curriedAdd = curry(add);
 * 
 * curriedAdd(1)(2); // Returns 3
 * curriedAdd(1, 2); // Also returns 3
 * ```
 * 
 * @param fn - The function to curry
 * @returns A curried version of the function
 */
export function curry<T extends AnyFunction>(
  fn: T
): CurryResult<T> {
  return function curried(...args: unknown[]): CurryResult<T> | ReturnType<T> {
    if (args.length >= fn.length) {
      return fn(...args as any);
    }
    return (...nextArgs: unknown[]) => curried(...args, ...nextArgs) as any;
  } as CurryResult<T>;
}

/**
 * Type helper for curried functions.
 */
type CurryResult<T extends AnyFunction> = T extends (a: infer A, b: infer B) => infer R
  ? (a: A) => (b: B) => R
  : T extends (a: infer A) => infer R
    ? (a: A) => R
    : T;

// ============================================================
// Partial Application Utilities
// ============================================================

/**
 * Partially applies arguments to a function.
 * 
 * @example
 * ```typescript
 * const add = (a: number, b: number, c: number) => a + b + c;
 * const addFive = partial(add, [5]);
 * const addFiveAndTen = partial(add, [5, 10]);
 * 
 * addFive(3, 4); // 5 + 3 + 4 = 12
 * addFiveAndTen(1); // 5 + 10 + 1 = 16
 * ```
 * 
 * @param fn - The function to partially apply
 * @param args - The arguments to apply (use `_` as placeholder)
 * @returns A function with some arguments applied
 */
export function partial<T extends AnyFunction>(
  fn: T,
  args: unknown[]
): (...rest: unknown[]) => ReturnType<T> {
  return (...rest: unknown[]) => {
    const fullArgs = args.map((arg) => (arg === PLACEHOLDER ? rest.shift() : arg));
    return fn(...fullArgs, ...rest) as ReturnType<T>;
  };
}

/**
 * Placeholder for partial application.
 * Use in place of an argument that will be provided later.
 */
export const PLACEHOLDER = Symbol('partial-placeholder');

// ============================================================
// Tap Function - Side Effects Without Interrupting Pipeline
// ============================================================

/**
 * Creates a function that executes a side effect and returns the input unchanged.
 * Useful for logging, debugging, or adding middleware to a pipeline.
 * 
 * @example
 * ```typescript
 * const addOne = (n: number) => n + 1;
 * const double = (n: number) => n * 2;
 * const logValue = tap((n: number) => console.log('Value:', n));
 * 
 * const pipeline = pipe(addOne, logValue, double);
 * pipeline(5); // Logs "Value: 6", returns 12
 * ```
 * 
 * @param fn - The side effect function
 * @returns A function that executes the side effect and returns the input
 */
export function tap<T>(fn: (value: T) => void): (value: T) => T {
  return (value: T) => {
    fn(value);
    return value;
  };
}

/**
 * Async version of tap for async side effects.
 * 
 * @example
 * ```typescript
 * const saveToLog = async (data: unknown) => { await logService.save(data); };
 * const asyncTap = asyncTapFn(saveToLog);
 * ```
 * 
 * @param fn - The async side effect function
 * @returns A function that awaits the side effect and returns the input
 */
export function asyncTapFn<T>(fn: (value: T) => Promise<void>): (value: T) => Promise<T> {
  return async (value: T) => {
    await fn(value);
    return value;
  };
}

// ============================================================
// Identity Function
// ============================================================

/**
 * Returns the input value unchanged.
 * Useful as a starting point in pipelines or default case.
 * 
 * @example
 * ```typescript
 * const optionalTransform = (shouldTransform: boolean, fn: Function) => {
 *   return shouldTransform ? fn : identity;
 * };
 * ```
 * 
 * @param value - The value to return
 * @returns The same value
 */
export function identity<T>(value: T): T {
  return value;
}

// ============================================================
// Retry with Exponential Backoff (Functional Style)
// ============================================================

/**
 * Retries an operation with exponential backoff, returning a Result.
 * 
 * @example
 * ```typescript
 * const fetchData = () => fetch('/api/data').then(r => r.json());
 * 
 * const result = await retryResult(
 *   fetchData,
 *   {
 *     maxAttempts: 3,
 *     initialDelayMs: 100,
 *   }
 * );
 * 
 * if (result.isSuccess) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 * 
 * @param fn - The async function to retry
 * @param options - Retry configuration
 * @returns A Result containing the resolved value or error
 */
export async function retryResult<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    factor?: number;
  } = {}
): Promise<Result<T, Error>> {
  const {
    maxAttempts = 3,
    initialDelayMs = 100,
    maxDelayMs = 30000,
    factor = 2,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = tryCatch(fn);

    if (result.isSuccess) {
      return result;
    }

    lastError = result.error;

    if (attempt < maxAttempts) {
      const delay = Math.min(initialDelayMs * Math.pow(factor, attempt - 1), maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return failure(lastError!);
}