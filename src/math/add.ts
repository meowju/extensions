/**
 * Adds two numbers together.
 *
 * @param a - The first number to add
 * @param b - The second number to add
 * @returns The sum of a and b
 *
 * @example
 * ```typescript
 * add(2, 3);      // Returns 5
 * add(-1, 1);     // Returns 0
 * add(0.1, 0.2);  // Returns 0.30000000000000004 (floating-point precision)
 * ```
 *
 * @remarks
 * This function handles standard numeric arithmetic including integers and floats.
 * Note that JavaScript floating-point arithmetic may introduce precision errors.
 * For precise decimal arithmetic, consider using a library like decimal.js.
 */
export function add(a: number, b: number): number {
  return a + b;
}