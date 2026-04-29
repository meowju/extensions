/**
 * Utility Functions Module
 * A collection of TypeScript-first utility functions following best practices
 * 
 * Best practices applied:
 * - Strict TypeScript with no 'any' types
 * - Generic types for reusability
 * - Proper function overloading
 * - Comprehensive type inference
 * - Edge case handling
 * - Immutable input handling
 */

import type { ReadonlyArray } from './types.js';

/**
 * Debounces a function, ensuring it's called only after a specified delay
 * since the last invocation.
 * 
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds (must be >= 0)
 * @returns A debounced version of the input function
 * 
 * @example
 * ```typescript
 * const debouncedSearch = debounce(searchAPI, 300);
 * inputElement.addEventListener('input', (e) => debouncedSearch(e.target.value));
 * ```
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  if (delay < 0) {
    throw new RangeError('Delay must be a non-negative number');
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return function (this: unknown, ...args: Parameters<T>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * Delays execution for a specified duration.
 * 
 * @param ms - Duration in milliseconds (must be >= 0)
 * @returns A promise that resolves after the delay
 * 
 * @example
 * ```typescript
 * await delay(1000);
 * console.log('Executed after 1 second');
 * ```
 */
export async function delay(ms: number): Promise<void> {
  if (ms < 0) {
    throw new RangeError('Delay duration must be a non-negative number');
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Groups elements of an array by a key function.
 * 
 * @param array - The array to group
 * @param keyFn - Function to determine group key
 * @returns A record mapping keys to arrays of grouped elements
 * 
 * @example
 * ```typescript
 * const people = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
 * const grouped = groupBy(people, (p) => String(p.age));
 * // { '30': [{ name: 'Alice', age: 30 }], '25': [{ name: 'Bob', age: 25 }] }
 * ```
 */
export function groupBy<T, K extends string | number | symbol>(
  array: readonly T[],
  keyFn: (item: T, index: number) => K
): Record<K, T[]> {
  return array.reduce<Record<K, T[]>>((groups, item, index) => {
    const key = keyFn(item, index);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

/**
 * Creates a deep partial type for optional nested object properties.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Flattens a nested array to a specified depth.
 * 
 * @param array - The array to flatten
 * @param depth - Maximum depth to flatten (default: Infinity)
 * @returns A new flattened array
 * 
 * @example
 * ```typescript
 * flatten([1, [2, [3, [4]]]], 1); // [1, 2, [3, [4]]]
 * flatten([1, [2, [3, [4]]]]);     // [1, 2, 3, 4]
 * ```
 */
export function flatten<T>(array: readonly T[], depth = Infinity): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected an array');
  }

  return array.flat(depth);
}

/**
 * Returns unique elements from an array based on a comparator.
 * 
 * @param array - The array to deduplicate
 * @param comparator - Optional function to determine uniqueness (default: strict equality)
 * @returns A new array with unique elements
 * 
 * @example
 * ```typescript
 * unique([1, 2, 2, 3, 3, 3]);                    // [1, 2, 3]
 * unique(users, (a, b) => a.id === b.id);        // deduplicate by ID
 * ```
 */
export function unique<T, U>(
  array: readonly T[],
  comparator: (item: T) => U = (item) => item as unknown as U
): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected an array');
  }

  const seen = new Set<U>();
  const result: T[] = [];

  for (const item of array) {
    const key = comparator(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

/**
 * Safely accesses nested object properties.
 * 
 * @param obj - The object to access
 * @param path - Dot-notation path (e.g., 'user.profile.name')
 * @param defaultValue - Value to return if path doesn't exist
 * @returns The accessed value or default
 * 
 * @example
 * ```typescript
 * const name = get(obj, 'user.profile.name', 'Anonymous');
 * ```
 */
export function get<T = unknown>(
  obj: object,
  path: string,
  defaultValue?: T
): T | undefined {
  if (typeof path !== 'string' || path === '') {
    throw new TypeError('Path must be a non-empty string');
  }

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }

    if (typeof current !== 'object' || !Object.hasOwn(current, key)) {
      return defaultValue;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current as T;
}

/**
 * Merges multiple partial objects into a single object.
 * Later objects override earlier ones.
 * 
 * @param sources - Objects to merge
 * @returns A merged object with all properties
 * 
 * @example
 * ```typescript
 * const merged = merge(defaults, userPrefs, overrides);
 * ```
 */
export function merge<T extends object>(...sources: (Partial<T> | null | undefined)[]): T {
  const result = {} as T;

  for (const source of sources) {
    if (source && typeof source === 'object') {
      for (const key of Object.keys(source) as (keyof T)[]) {
        (result as Record<string, unknown>)[key as string] = source[key];
      }
    }
  }

  return result;
}

// ============================================================
// Type Definitions (separate file concept for organization)
// ============================================================

/**
 * Represents an array that should not be mutated.
 */
export type { ReadonlyArray };

/**
 * Result type for operations that can fail.
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Wraps a value in a Result type for safe error propagation.
 */
export function tryCatch<T>(
  fn: () => T
): Result<T, Error> {
  try {
    return { success: true, data: fn() };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Creates a Maybe type for optional chaining scenarios.
 */
export type Maybe<T> = T | null | undefined;

/**
 * Extracts the non-nullish value or throws.
 */
export function coalesce<T>(value: Maybe<T>, fallback: T): T {
  return value ?? fallback;
}