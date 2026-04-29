/**
 * Tests for factorial function with edge cases
 */

import { describe, it, expect } from 'bun:test';
import { evaluateExpression } from '../../src/calculator/parser';

describe('Factorial Function Tests', () => {
  describe('Edge Cases', () => {
    it('should return 1 for factorial(0) - base case', () => {
      const result = evaluateExpression('0!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(1);
    });

    it('should return 1 for factorial(1) - base case', () => {
      const result = evaluateExpression('1!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(1);
    });

    it('should return 2 for factorial(2)', () => {
      const result = evaluateExpression('2!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });

    it('should return 6 for factorial(3)', () => {
      const result = evaluateExpression('3!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(6);
    });

    it('should return 24 for factorial(4)', () => {
      const result = evaluateExpression('4!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(24);
    });

    it('should return 120 for factorial(5) - common test case', () => {
      const result = evaluateExpression('5!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(120);
    });

    it('should return 720 for factorial(6)', () => {
      const result = evaluateExpression('6!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(720);
    });

    it('should return 5040 for factorial(7)', () => {
      const result = evaluateExpression('7!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(5040);
    });

    it('should return 40320 for factorial(8)', () => {
      const result = evaluateExpression('8!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(40320);
    });

    it('should return 362880 for factorial(9)', () => {
      const result = evaluateExpression('9!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(362880);
    });

    it('should return 3628800 for factorial(10) - common test case', () => {
      const result = evaluateExpression('10!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(3628800);
    });
  });

  describe('Negative Numbers', () => {
    // Note: -1! is parsed as -(1!) = -1, not (-1)! due to operator precedence.
    // Factorial binds tighter than unary minus in standard mathematical convention.
    it('should evaluate -1! as -(1!) = -1', () => {
      const result = evaluateExpression('-1!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(-1);
    });

    it('should evaluate -5! as -(5!) = -120', () => {
      const result = evaluateExpression('-5!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(-120);
    });

    it('should evaluate -10! as -(10!) = -3628800', () => {
      const result = evaluateExpression('-10!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(-3628800);
    });
  });

  describe('Decimal Numbers', () => {
    it('should reject factorial(0.5)', () => {
      const result = evaluateExpression('0.5!');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Factorial requires integer input');
    });

    it('should reject factorial(2.5)', () => {
      const result = evaluateExpression('2.5!');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Factorial requires integer input');
    });

    it('should reject factorial(3.14)', () => {
      const result = evaluateExpression('3.14!');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Factorial requires integer input');
    });
  });

  describe('Overflow', () => {
    it('should reject factorial(171) - overflow threshold', () => {
      const result = evaluateExpression('171!');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Factorial overflow (exceeds MAX_VALUE)');
    });

    it('should allow factorial(170) - maximum allowed', () => {
      const result = evaluateExpression('170!');
      expect(result.success).toBe(true);
      // This is a very large number, just verify it returns something
      expect(typeof result.value).toBe('number');
    });
  });

  describe('Combined Operations', () => {
    it('should handle factorial with addition: 3! + 2', () => {
      const result = evaluateExpression('3!+2');
      expect(result.success).toBe(true);
      expect(result.value).toBe(8); // 6 + 2
    });

    it('should handle factorial with multiplication: 3! * 2', () => {
      const result = evaluateExpression('3!*2');
      expect(result.success).toBe(true);
      expect(result.value).toBe(12); // 6 * 2
    });

    it('should handle factorial with power: (3!)!', () => {
      const result = evaluateExpression('3!!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(720); // 6! = 720
    });

    it('should handle factorial in parentheses: (5)!', () => {
      const result = evaluateExpression('(5)!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(120);
    });

    it('should handle complex expression: 2! + 3!', () => {
      const result = evaluateExpression('2!+3!');
      expect(result.success).toBe(true);
      expect(result.value).toBe(8); // 2 + 6
    });
  });

  describe('Error Handling', () => {
    it('should reject standalone factorial', () => {
      const result = evaluateExpression('!');
      expect(result.success).toBe(false);
    });

    it('should handle factorial followed by operator', () => {
      const result = evaluateExpression('5!+3');
      expect(result.success).toBe(true);
      expect(result.value).toBe(123);
    });
  });
});