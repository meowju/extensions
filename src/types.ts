/**
 * Type definitions for utility functions
 */

// Re-export readonly array for convenience
export type ReadonlyArray<T> = readonly T[];

/**
 * Represents a readonly key-value map.
 */
export type ReadonlyRecord<K extends string | number | symbol, V> = Readonly<Record<K, V>>;

/**
 * A function that takes no arguments and returns type T.
 */
export type Producer<T> = () => T;

/**
 * A function that takes type T and returns type R.
 */
export type Transformer<T, R> = (value: T) => R;

/**
 * A predicate function that returns a boolean.
 */
export type Predicate<T> = (value: T) => boolean;

/**
 * Consumer function that takes a value but returns nothing.
 */
export type Consumer<T> = (value: T) => void;

/**
 * Comparator function for sorting.
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * Async version of Transformer.
 */
export type AsyncTransformer<T, R> = (value: T) => Promise<R>;