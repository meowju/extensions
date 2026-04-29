/**
 * Result pattern for functional error handling
 */

export type Result<T, E = any> = Success<T> | Failure<E>;

export class Success<T> {
  readonly isSuccess = true;
  readonly isFailure = false;
  constructor(readonly value: T) {}
}

export class Failure<E> {
  readonly isSuccess = false;
  readonly isFailure = true;
  constructor(readonly error: E) {}
}

export function success<T>(value: T): Success<T> {
  return new Success(value);
}

export function failure<E>(error: E): Failure<E> {
  return new Failure(error);
}

export async function tryCatch<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    const value = await fn();
    return success(value);
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}
