/**
 * Divides the first number by the second.
 *
 * @param a - The dividend (number to be divided)
 * @param b - The divisor (number to divide by)
 * @returns The quotient of a divided by b
 * @throws Error if b is zero
 *
 * @example
 * ```typescript
 * divide(10, 2);   // Returns 5
 * divide(7, 2);    // Returns 3.5
 * divide(-6, 3);   // Returns -2
 * ```
 *
 * @remarks
 * This function handles standard numeric division including integers and floats.
 * Throws an error when attempting to divide by zero.
 */
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}