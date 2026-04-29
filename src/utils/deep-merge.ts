/**
 * Deep Merge Utility
 * 
 * Recursively merges objects with type-safe handling of nested structures.
 * Source values override target values at any depth.
 * 
 * @example
 * ```typescript
 * const target = { a: 1, b: { c: 2, d: 3 } };
 * const source = { b: { c: 5, e: 6 }, f: 7 };
 * const result = deepMerge(target, source);
 * // { a: 1, b: { c: 5, d: 3, e: 6 }, f: 7 }
 * ```
 */

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Checks if a value is a plain object (not null, array, Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Deeply merges two objects, with source values taking precedence.
 * 
 * @param target - The base object (will not be mutated)
 * @param source - The source object whose values override target values
 * @returns A new object with merged values
 * 
 * @throws {TypeError} If either argument is not a plain object
 */
export function deepMerge<T extends Record<string, unknown>, S extends Record<string, unknown>>(
  target: T,
  source: S
): T & S;

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: DeepPartial<T>
): T;

export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  // Validate inputs
  if (!isPlainObject(target)) {
    throw new TypeError('Target must be a plain object');
  }
  if (!isPlainObject(source)) {
    throw new TypeError('Source must be a plain object');
  }

  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    // If both values are plain objects, recurse
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue as Record<string, unknown>);
    } else if (sourceValue !== undefined) {
      // Source value takes precedence (including null and falsy values)
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Deeply merges multiple objects, with later sources taking precedence.
 * 
 * @param objects - Two or more objects to merge
 * @returns A new object with merged values from all sources
 */
export function deepMergeAll<T extends Record<string, unknown>[]>(
  ...objects: T
): UnionToIntersection<T[number]> {
  if (objects.length === 0) {
    return {} as UnionToIntersection<T[number]>;
  }
  
  return objects.reduce((acc, obj) => 
    deepMerge(acc, obj) as Record<string, unknown>
  ) as UnionToIntersection<T[number]>;
}

/**
 * Type utility: Converts a union of types to their intersection
 */
type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

export default deepMerge;
