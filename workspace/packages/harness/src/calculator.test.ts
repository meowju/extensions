/**
 * Calculator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  add,
  subtract,
  multiply,
  divide,
  calculate,
  calculateStrict,
  validateInput,
  isValidNumber,
  Operation,
  CalculationInput
} from './calculator.js';

describe('Calculator Core', () => {
  describe('Basic Operations', () => {
    describe('add', () => {
      it('should add two positive numbers', () => {
        expect(add(2, 3)).toBe(5);
        expect(add(10, 20)).toBe(30);
        expect(add(0, 0)).toBe(0);
      });

      it('should handle negative numbers', () => {
        expect(add(-5, 3)).toBe(-2);
        expect(add(-5, -5)).toBe(-10);
      });

      it('should handle decimal numbers', () => {
        expect(add(0.1, 0.2)).toBeCloseTo(0.3);
        expect(add(1.5, 2.5)).toBe(4);
      });
    });

    describe('subtract', () => {
      it('should subtract two positive numbers', () => {
        expect(subtract(5, 3)).toBe(2);
        expect(subtract(10, 20)).toBe(-10);
      });

      it('should handle negative numbers', () => {
        expect(subtract(-5, -3)).toBe(-2);
        expect(subtract(-5, 3)).toBe(-8);
      });
    });

    describe('multiply', () => {
      it('should multiply two positive numbers', () => {
        expect(multiply(2, 3)).toBe(6);
        expect(multiply(10, 10)).toBe(100);
      });

      it('should handle negative numbers', () => {
        expect(multiply(-2, 3)).toBe(-6);
        expect(multiply(-2, -3)).toBe(6);
      });

      it('should handle zero', () => {
        expect(multiply(100, 0)).toBe(0);
        expect(multiply(0, 0)).toBe(0);
      });
    });

    describe('divide', () => {
      it('should divide two positive numbers', () => {
        expect(divide(6, 3)).toBe(2);
        expect(divide(100, 10)).toBe(10);
      });

      it('should handle decimal results', () => {
        expect(divide(7, 2)).toBe(3.5);
        expect(divide(1, 3)).toBeCloseTo(0.333, 3);
      });

      it('should throw on division by zero', () => {
        expect(() => divide(5, 0)).toThrow('Division by zero is not allowed');
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
        expect(isValidNumber('5')).toBe(false);
      });
    });

    describe('validateInput', () => {
      it('should validate correct inputs', () => {
        const validInput: CalculationInput = { operand1: 5, operand2: 3, operation: '+' };
        expect(validateInput(validInput)).toBe(true);
      });

      it('should reject invalid operations', () => {
        const invalidInput = { operand1: 5, operand2: 3, operation: '%' };
        expect(validateInput(invalidInput)).toBe(false);
      });

      it('should reject non-numeric operands', () => {
        const invalidInput = { operand1: 'a', operand2: 3, operation: '+' };
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
      const result = calculate({ operand1: 5, operand2: 0, operation: '/' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Division by zero');
      }
    });

    it('should support word-based operations', () => {
      expect(calculate({ operand1: 5, operand2: 3, operation: 'add' }).success).toBe(true);
      expect(calculate({ operand1: 5, operand2: 3, operation: 'subtract' }).success).toBe(true);
      expect(calculate({ operand1: 5, operand2: 3, operation: 'multiply' }).success).toBe(true);
      expect(calculate({ operand1: 6, operand2: 2, operation: 'divide' }).success).toBe(true);
    });

    it('should return error for unknown operations', () => {
      const result = calculate({ operand1: 5, operand2: 3, operation: '%' as Operation });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Unknown operation');
      }
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
  });
});