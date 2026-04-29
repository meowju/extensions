/**
 * Multiplies two numbers together.
 *
 * @param a - The first factor
 * @param b - The second factor
 * @returns The product of a and b
 *
 * @example
 * ```typescript
 * multiply(4, 5);   // Returns 20
 * multiply(-2, 3); // Returns -6
 * multiply(0, 100); // Returns 0
 * ```
 *
 * @remarks
 * This function handles standard numeric multiplication including integers and floats.
 * Returns 0 if either operand is 0.
 */
export function multiply(a: number, b: number): number {
  return a * b;
}