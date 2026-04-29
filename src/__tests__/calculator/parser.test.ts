/**
 * Tests for calculator expression parser
 */

import { describe, it, expect } from 'vitest';
import { evaluateExpression, validateExpression } from '../calculator/parser';

describe('Expression Parser', () => {
  describe('basic operations', () => {
    it('should parse addition', () => {
      expect(evaluateExpression('2 + 3')).toEqual({ success: true, value: 5 });
    });

    it('should parse subtraction', () => {
      expect(evaluateExpression('10 - 4')).toEqual({ success: true, value: 6 });
    });

    it('should parse multiplication', () => {
      expect(evaluateExpression('6 * 7')).toEqual({ success: true, value: 42 });
    });

    it('should parse division', () => {
      expect(evaluateExpression('20 / 4')).toEqual({ success: true, value: 5 });
    });

    it('should parse power', () => {
      expect(evaluateExpression('2 ^ 8')).toEqual({ success: true, value: 256 });
    });
  });

  describe('operator precedence', () => {
    it('should multiply before add', () => {
      expect(evaluateExpression('2 + 3 * 4')).toEqual({ success: true, value: 14 });
    });

    it('should divide before subtract', () => {
      expect(evaluateExpression('10 - 6 / 2')).toEqual({ success: true, value: 7 });
    });

    it('should handle power precedence', () => {
      expect(evaluateExpression('2 * 3 ^ 2')).toEqual({ success: true, value: 18 });
    });

    it('should handle all precedence levels', () => {
      expect(evaluateExpression('1 + 2 * 3 - 4 / 2')).toEqual({ success: true, value: 5 });
    });
  });

  describe('parentheses', () => {
    it('should respect parentheses', () => {
      expect(evaluateExpression('(2 + 3) * 4')).toEqual({ success: true, value: 20 });
    });

    it('should handle nested parentheses', () => {
      expect(evaluateExpression('((1 + 2) * (3 + 4))')).toEqual({ success: true, value: 21 });
    });

    it('should change precedence with parentheses', () => {
      expect(evaluateExpression('(2 + 3) * (4 + 5)')).toEqual({ success: true, value: 45 });
    });
  });

  describe('unary minus', () => {
    it('should handle unary minus', () => {
      expect(evaluateExpression('-5 + 3')).toEqual({ success: true, value: -2 });
    });

    it('should handle double negative', () => {
      expect(evaluateExpression('--5')).toEqual({ success: true, value: 5 });
    });

    it('should handle negative in parentheses', () => {
      expect(evaluateExpression('(-5) * 3')).toEqual({ success: true, value: -15 });
    });
  });

  describe('decimal numbers', () => {
    it('should handle decimal numbers', () => {
      expect(evaluateExpression('0.5 + 0.5')).toEqual({ success: true, value: 1 });
    });

    it('should handle complex decimals', () => {
      const result = evaluateExpression('0.1 + 0.2');
      expect(result.success).toBe(true);
      expect(result.value!).toBeCloseTo(0.3, 10);
    });
  });

  describe('error handling', () => {
    it('should return error for empty expression', () => {
      expect(evaluateExpression('')).toEqual({ success: false, error: 'Empty expression' });
    });

    it('should return error for mismatched parentheses', () => {
      const result = evaluateExpression('(2 + 3');
      expect(result.success).toBe(false);
      expect(result.error).toContain('parentheses');
    });

    it('should return error for division by zero', () => {
      const result = evaluateExpression('10 / 0');
      expect(result.success).toBe(false);
      expect(result.error).toContain('zero');
    });
  });

  describe('validateExpression', () => {
    it('should validate correct expression', () => {
      expect(validateExpression('2 + 3 * 4')).toEqual({ valid: true });
    });

    it('should validate expression with parentheses', () => {
      expect(validateExpression('(2 + 3) * 4')).toEqual({ valid: true });
    });

    it('should validate balanced parentheses', () => {
      expect(validateExpression('(2 + 3')).toEqual({ valid: false });
    });

    it('should detect mismatched parentheses', () => {
      const result = validateExpression('(2 + 3');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('parentheses');
    });
  });
});