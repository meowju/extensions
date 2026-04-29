/**
 * TypeScript Utility: Retry with Result Pattern
 * Follows best practices: explicit types, discriminated unions, async patterns
 */

type Result<T, E = Error> =
  | { success: true; data: T; attempts: number }
  | { success: false; error: E; attempts: number };

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: 'linear' | 'exponential';
  retryableErrors?: (new (...args: any[]) => Error)[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoff: 'exponential',
  retryableErrors: [Error],
};

/**
 * Sleep utility with proper typing
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Type-safe retry wrapper with Result pattern
 * @example
 * ```typescript
 * const result = await retry(() => fetch('/api/data'));
 * if (result.success) {
 *   console.log(result.data, result.attempts);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<Result<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await fn();
      return { success: true, data, attempts: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const isRetryable = opts.retryableErrors.some(
        (ErrorClass) => lastError instanceof ErrorClass
      );

      if (!isRetryable || attempt === opts.maxAttempts) {
        return { 
          success: false, 
          error: lastError, 
          attempts: attempt 
        };
      }

      const delay = opts.delayMs * (opts.backoff === 'exponential' 
        ? Math.pow(2, attempt - 1) 
        : attempt);

      await sleep(delay);
    }
  }

  return { success: false, error: lastError!, attempts: opts.maxAttempts };
}

/**
 * Synchronous retry for non-async functions
 */
function retrySync<T>(fn: () => T, options: RetryOptions = {}): T {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === opts.maxAttempts) {
        throw lastError;
      }
    }
  }

  throw lastError!;
}

export { retry, retrySync };
export type { Result, RetryOptions };
