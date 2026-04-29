/**
 * Subtracts the second number from the first.
 *
 * @param a - The minuend (number to subtract from)
 * @param b - The subtrahend (number to subtract)
 * @returns The difference of a and b
 *
 * @example
 * ```typescript
 * subtract(5, 3);   // Returns 2
 * subtract(10, 15); // Returns -5
 * subtract(0, 5);   // Returns -5
 * ```
 *
 * @remarks
 * This function handles standard numeric subtraction including integers and floats.
 * Handles negative results correctly.
 */
export function subtract(a: number, b: number): number {
  return a - b;
}