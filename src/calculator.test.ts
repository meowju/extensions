/**
 * Calculator Tests
 * 
 * Test suite for the calculator core module.
 * Tests use the Result<T> pattern (Ok/Err discriminated union).
 */

import { describe, it, expect } from 'bun:test';
import {
  add,
  subtract,
  multiply,
  divide,
  calculate,
  calculateStrict,
  validateInput,
  isValidNumber,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
} from './calculator';

type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | '+' | '-' | '*' | '/' | '×' | '÷';
interface CalculationInput {
  operand1: number;
  operand2: number;
  operation: Operation;
}

describe('Calculator Core', () => {
  describe('Basic Operations', () => {
    describe('add', () => {
      it('should add two positive numbers', () => {
        const result = add(2, 3);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBe(5);
        
        expect(unwrap(add(10, 20))).toBe(30);
        expect(unwrap(add(0, 0))).toBe(0);
      });

      it('should handle negative numbers', () => {
        expect(unwrap(add(-5, 3))).toBe(-2);
        expect(unwrap(add(-5, -5))).toBe(-10);
      });

      it('should handle decimal numbers', () => {
        expect(unwrap(add(0.1, 0.2))).toBeCloseTo(0.3);
        expect(unwrap(add(1.5, 2.5))).toBe(4);
      });
    });

    describe('subtract', () => {
      it('should subtract two positive numbers', () => {
        expect(unwrap(subtract(5, 3))).toBe(2);
        expect(unwrap(subtract(10, 20))).toBe(-10);
      });

      it('should handle negative numbers', () => {
        expect(unwrap(subtract(-5, -3))).toBe(-2);
        expect(unwrap(subtract(-5, 3))).toBe(-8);
      });
    });

    describe('multiply', () => {
      it('should multiply two positive numbers', () => {
        expect(unwrap(multiply(2, 3))).toBe(6);
        expect(unwrap(multiply(10, 10))).toBe(100);
      });

      it('should handle negative numbers', () => {
        expect(unwrap(multiply(-2, 3))).toBe(-6);
        expect(unwrap(multiply(-2, -3))).toBe(6);
      });

      it('should handle zero', () => {
        expect(unwrap(multiply(100, 0))).toBe(0);
        expect(unwrap(multiply(0, 0))).toBe(0);
      });
    });

    describe('divide', () => {
      it('should divide two positive numbers', () => {
        expect(unwrap(divide(6, 3))).toBe(2);
        expect(unwrap(divide(100, 10))).toBe(10);
      });

      it('should handle decimal results', () => {
        expect(unwrap(divide(7, 2))).toBe(3.5);
        expect(unwrap(divide(1, 3))).toBeCloseTo(0.333, 3);
      });

      it('should return error for division by zero', () => {
        const result = divide(5, 0);
        expect(isErr(result)).toBe(true);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Division by zero');
        }
      });
    });
  });

  describe('Input Validation', () => {
    describe('isValidNumber', () => {
      it('should return true for valid numbers', () => {
        expect(isValidNumber(5)).toBe(true);
        expect(isValidNumber(0)).toBe(true);
        expect(isValidNumber(-5)).toBe(true);
        expect(isValidNumber(3.14)).toBe(true);
      });

      it('should return false for invalid values', () => {
        expect(isValidNumber(NaN)).toBe(false);
        expect(isValidNumber(Infinity)).toBe(false);
        expect(isValidNumber(undefined)).toBe(false);
        expect(isValidNumber(null)).toBe(false);
        expect(isValidNumber('5' as unknown as number)).toBe(false);
      });
    });

    describe('validateInput', () => {
      it('should validate correct inputs', () => {
        const validInput: CalculationInput = { operand1: 5, operand2: 3, operation: '+' };
        expect(validateInput(validInput)).toBe(true);
      });

      it('should reject invalid operations', () => {
        const invalidInput = { operand1: 5, operand2: 3, operation: 'unknown_op' } as unknown as CalculationInput;
        expect(validateInput(invalidInput)).toBe(false);
      });

      it('should reject non-numeric operands', () => {
        const invalidInput = { operand1: 'a', operand2: 3, operation: '+' } as unknown as CalculationInput;
        expect(validateInput(invalidInput)).toBe(false);
      });

      it('should reject null/undefined', () => {
        expect(validateInput(null)).toBe(false);
        expect(validateInput(undefined)).toBe(false);
      });
    });
  });

  describe('calculate', () => {
    it('should return successful result for addition', () => {
      const result = calculate({ operand1: 5, operand2: 3, operation: '+' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(8);
      }
    });

    it('should return successful result for subtraction', () => {
      const result = calculate({ operand1: 10, operand2: 4, operation: '-' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(6);
      }
    });

    it('should return successful result for multiplication', () => {
      const result = calculate({ operand1: 5, operand2: 4, operation: '*' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(20);
      }
    });

    it('should return successful result for division', () => {
      const result = calculate({ operand1: 20, operand2: 4, operation: '/' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(5);
      }
    });

    it('should return error for division by zero', () => {
      const result = calculate({ operand1: 5, operand2: 0, operation: 'divide' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Division by zero');
      }
    });

    it('should support word-based operations', () => {
      expect(calculate({ operand1: 5, operand2: 3, operation: 'add' }).success).toBe(true);
      expect(calculate({ operand1: 5, operand2: 3, operation: 'subtract' }).success).toBe(true);
      expect(calculate({ operand1: 5, operand2: 3, operation: 'multiply' }).success).toBe(true);
      expect(calculate({ operand1: 6, operand2: 2, operation: 'divide' }).success).toBe(true);
    });

    it('should return error for unknown operations', () => {
      const result = calculate({ operand1: 5, operand2: 3, operation: 'unknown_op' as Operation });
      expect(result.success).toBe(false);
    });
  });

  describe('calculateStrict', () => {
    it('should return result directly', () => {
      expect(calculateStrict({ operand1: 5, operand2: 3, operation: '+' })).toBe(8);
    });

    it('should throw on error', () => {
      expect(() => 
        calculateStrict({ operand1: 5, operand2: 0, operation: '/' })
      ).toThrow();
    });
  });

  describe('Result Types', () => {
    it('should support discriminated union pattern', () => {
      const result = calculate({ operand1: 5, operand2: 3, operation: '+' });
      
      // TypeScript should narrow the type here
      if (result.success) {
        const value: number = result.value;
        expect(typeof value).toBe('number');
      } else {
        const error: string = result.error;
        expect(typeof error).toBe('string');
      }
    });

    it('should work with ok/err helpers', () => {
      expect(ok(42)).toEqual({ success: true, value: 42 });
      expect(err('error')).toEqual({ success: false, error: 'error' });
    });

    it('should work with unwrap', () => {
      expect(unwrap(ok(42))).toBe(42);
      expect(() => unwrap(err('test'))).toThrow('test');
    });

    it('should work with unwrapOr', () => {
      expect(unwrapOr(ok(42), 0)).toBe(42);
      expect(unwrapOr(err('test'), 0)).toBe(0);
    });
  });
});
