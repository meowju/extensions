/**
 * Calculator Utility Functions
 * 
 * Core calculation and formatting logic.
 */

import type { Operation } from '../types/Calculator';

/** Maximum number of digits allowed */
export const MAX_DIGITS = 12;

/** Maximum displayable value */
export const MAX_VALUE = 999999999999;

/** Minimum displayable value (absolute) */
export const MIN_VALUE = -999999999999;

/**
 * Performs arithmetic calculation between two numbers
 * @param prev - First operand
 * @param next - Second operand
 * @param operation - Arithmetic operation to perform
 * @returns Result of calculation or null on error (division by zero, overflow)
 */
export function calculate(
  prev: string,
  next: string,
  operation: Operation
): string | null {
  const prevNum = parseFloat(prev);
  const nextNum = parseFloat(next);

  if (isNaN(prevNum) || isNaN(nextNum)) {
    return null;
  }

  let result: number;

  switch (operation) {
    case '+':
      result = prevNum + nextNum;
      break;
    case '-':
      result = prevNum - nextNum;
      break;
    case '×':
      result = prevNum * nextNum;
      break;
    case '÷':
      if (nextNum === 0) {
        return null; // Division by zero
      }
      result = prevNum / nextNum;
      break;
    default:
      return null;
  }

  // Check for overflow
  if (result > MAX_VALUE || result < MIN_VALUE) {
    return null;
  }

  // Check for underflow (very small non-zero numbers)
  if (result !== 0 && Math.abs(result) < 1e-10) {
    return null;
  }

  return result.toString();
}

/**
 * Performs a single operation on a value
 * @param value - The input value
 * @param operation - The operation to perform
 * @returns Result of the operation
 */
export function performOperation(value: string, operation: '+' | '-' | '×' | '÷' | '%' | '±'): string {
  const num = parseFloat(value);
  
  if (isNaN(num)) return '0';

  switch (operation) {
    case '%':
      return (num / 100).toString();
    case '±':
      return (num * -1).toString();
    default:
      return value;
  }
}

/**
 * Formats a number string for display
 * @param value - The number to format
 * @returns Formatted display string
 */
export function formatNumber(value: string): string {
  // Handle empty or invalid input
  if (!value || value === '') return '0';
  
  // Parse the number
  let num = parseFloat(value);
  
  if (isNaN(num)) return 'Error';
  
  // Handle zero (including -0)
  if (num === 0) return '0';
  
  // Check for scientific notation threshold
  const absNum = Math.abs(num);
  
  // Large numbers: use scientific notation
  if (absNum >= 1e12) {
    return num.toExponential(2);
  }
  
  // Very small numbers: use scientific notation
  if (absNum < 1e-6 && absNum > 0) {
    return num.toExponential(2);
  }
  
  // Convert to string and handle precision
  let formatted = num.toString();
  
  // Limit to MAX_DIGITS significant digits
  if (formatted.replace('.', '').replace('-', '').length > MAX_DIGITS) {
    // Determine decimal places to preserve
    const precision = MAX_DIGITS - (num < 0 ? 1 : 0);
    if (formatted.includes('.')) {
      const [intPart, decPart] = formatted.split('.');
      if (intPart.replace('-', '').length >= precision) {
        formatted = num.toPrecision(precision);
      } else {
        const maxDec = precision - intPart.replace('-', '').length;
        formatted = num.toFixed(Math.max(0, Math.min(maxDec, 10)));
      }
    } else {
      formatted = num.toPrecision(precision);
    }
  }
  
  // Remove trailing zeros after decimal
  if (formatted.includes('.')) {
    formatted = formatted.replace(/\.?0+$/, '');
  }
  
  // Handle negative zero
  if (formatted === '-0') {
    formatted = '0';
  }
  
  return formatted;
}

/**
 * Validates if a digit can be added
 * @param currentValue - Current display value
 * @returns true if more digits can be added
 */
export function canAddDigit(currentValue: string): boolean {
  // Remove any non-digit characters for length check
  const digits = currentValue.replace(/[^0-9]/g, '');
  return digits.length < MAX_DIGITS;
}

/**
 * Validates decimal input
 * @param currentValue - Current display value
 * @returns true if decimal can be added
 */
export function canAddDecimal(currentValue: string): boolean {
  // Can add decimal if there's no decimal point in current number
  // and we're not about to start a new number
  return !currentValue.includes('.');
}

/**
 * Checks if the value is zero
 * @param value - Value to check
 * @returns true if value equals zero
 */
export function isZero(value: string): boolean {
  const num = parseFloat(value);
  return num === 0 || value === '0';
}

/**
 * Checks if a number is negative
 * @param value - Value to check
 * @returns true if value is negative
 */
export function isNegative(value: string): boolean {
  const num = parseFloat(value);
  return num < 0;
}
