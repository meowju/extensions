/**
 * Tests for calculator operations module
 */

import { describe, it, expect } from 'vitest';
import { BINARY_OPERATIONS, getPrecedence, getAssociativity } from '../calculator/operations';

describe('Calculator Operations', () => {
  describe('BINARY_OPERATIONS', () => {
    it('should have addition operation', () => {
      expect(BINARY_OPERATIONS['+']).toBeDefined();
      expect(BINARY_OPERATIONS['+'].symbol).toBe('+');
      expect(BINARY_OPERATIONS['+'].execute(2, 3)).toEqual({ success: true, value: 5 });
    });

    it('should have subtraction operation', () => {
      expect(BINARY_OPERATIONS['-']).toBeDefined();
      expect(BINARY_OPERATIONS['-'].symbol).toBe('-');
      expect(BINARY_OPERATIONS['-'].execute(5, 3)).toEqual({ success: true, value: 2 });
    });

    it('should have multiplication operation', () => {
      expect(BINARY_OPERATIONS['*']).toBeDefined();
      expect(BINARY_OPERATIONS['*'].symbol).toBe('*');
      expect(BINARY_OPERATIONS['*'].execute(4, 5)).toEqual({ success: true, value: 20 });
    });

    it('should have division operation', () => {
      expect(BINARY_OPERATIONS['/']).toBeDefined();
      expect(BINARY_OPERATIONS['/'].symbol).toBe('/');
      expect(BINARY_OPERATIONS['/'].execute(10, 2)).toEqual({ success: true, value: 5 });
    });

    it('should handle division by zero', () => {
      const result = BINARY_OPERATIONS['/'].execute(10, 0);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Division by zero');
    });

    it('should have power operation', () => {
      expect(BINARY_OPERATIONS['^']).toBeDefined();
      expect(BINARY_OPERATIONS['^'].symbol).toBe('^');
      expect(BINARY_OPERATIONS['^'].execute(2, 8)).toEqual({ success: true, value: 256 });
    });

    it('should handle zero exponent', () => {
      expect(BINARY_OPERATIONS['^'].execute(5, 0)).toEqual({ success: true, value: 1 });
    });

    it('should handle negative exponent', () => {
      expect(BINARY_OPERATIONS['^'].execute(2, -2)).toEqual({ success: true, value: 0.25 });
    });
  });

  describe('getPrecedence', () => {
    it('should return 1 for addition', () => {
      expect(getPrecedence('+')).toBe(1);
    });

    it('should return 1 for subtraction', () => {
      expect(getPrecedence('-')).toBe(1);
    });

    it('should return 2 for multiplication', () => {
      expect(getPrecedence('*')).toBe(2);
    });

    it('should return 2 for division', () => {
      expect(getPrecedence('/')).toBe(2);
    });

    it('should return 3 for power', () => {
      expect(getPrecedence('^')).toBe(3);
    });

    it('should return 0 for unknown operators', () => {
      expect(getPrecedence('%')).toBe(0);
    });
  });

  describe('getAssociativity', () => {
    it('should return left for addition', () => {
      expect(getAssociativity('+')).toBe('left');
    });

    it('should return left for subtraction', () => {
      expect(getAssociativity('-')).toBe('left');
    });

    it('should return left for multiplication', () => {
      expect(getAssociativity('*')).toBe('left');
    });

    it('should return left for division', () => {
      expect(getAssociativity('/')).toBe('left');
    });

    it('should return right for power', () => {
      expect(getAssociativity('^')).toBe('right');
    });
  });
});