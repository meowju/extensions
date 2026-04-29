import { describe, expect, test } from 'bun:test';
import { calculate, calculateString, formatResult } from './calculator';

describe('Calculator', () => {
  describe('calculate', () => {
    test('adds two numbers', () => {
      const result = calculate({ operand1: 2, operand2: 3, operation: 'add' });
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });

    test('subtracts two numbers', () => {
      const result = calculate({ operand1: 10, operand2: 4, operation: 'subtract' });
      expect(result.success).toBe(true);
      expect(result.value).toBe(6);
    });

    test('multiplies two numbers', () => {
      const result = calculate({ operand1: 6, operand2: 7, operation: 'multiply' });
      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });

    test('divides two numbers', () => {
      const result = calculate({ operand1: 20, operand2: 4, operation: 'divide' });
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });

    test('returns error for division by zero', () => {
      const result = calculate({ operand1: 10, operand2: 0, operation: 'divide' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Division by zero');
    });

    test('handles decimal numbers', () => {
      const result = calculate({ operand1: 1.5, operand2: 2.5, operation: 'add' });
      expect(result.success).toBe(true);
      expect(result.value).toBeCloseTo(4);
    });

    test('handles negative numbers', () => {
      const result = calculate({ operand1: -5, operand2: 3, operation: 'add' });
      expect(result.success).toBe(true);
      expect(result.value).toBe(-2);
    });
  });

  describe('calculateString', () => {
    test('parses "2 + 3"', () => {
      const result = calculateString('2 + 3');
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });

    test('parses "10 * 5"', () => {
      const result = calculateString('10 * 5');
      expect(result.success).toBe(true);
      expect(result.value).toBe(50);
    });

    test('accepts × symbol', () => {
      const result = calculateString('6 × 7');
      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });

    test('accepts ÷ symbol', () => {
      const result = calculateString('20 ÷ 4');
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });

    test('returns error for invalid expression', () => {
      const result = calculateString('invalid');
      expect(result.success).toBe(false);
    });

    test('returns error for unknown operator', () => {
      const result = calculateString('2 ^ 3');
      expect(result.success).toBe(false);
    });
  });

  describe('formatResult', () => {
    test('formats integers without decimals', () => {
      expect(formatResult(42)).toBe('42');
    });

    test('formats floats appropriately', () => {
      expect(formatResult(3.14159)).toBe('3.14159');
    });

    test('returns Error for non-finite values', () => {
      expect(formatResult(Infinity)).toBe('Error');
      expect(formatResult(NaN)).toBe('Error');
    });
  });
});
