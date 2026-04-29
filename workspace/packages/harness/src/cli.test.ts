/**
 * CLI Tests
 */

import { describe, it, expect } from 'vitest';
import { parseInput, formatResult } from './cli';
import { Operation } from './calculator.js';

describe('CLI Parser', () => {
  describe('parseInput', () => {
    it('should parse basic operations with symbols', () => {
      expect(parseInput('5 + 3')).toEqual({ operand1: 5, operand2: 3, operation: '+' });
      expect(parseInput('10 - 4')).toEqual({ operand1: 10, operand2: 4, operation: '-' });
      expect(parseInput('6 * 7')).toEqual({ operand1: 6, operand2: 7, operation: '*' });
      expect(parseInput('20 / 4')).toEqual({ operand1: 20, operand2: 4, operation: '/' });
    });

    it('should parse operations with words', () => {
      // Note: cli.ts normalizes word operations to symbols
      expect(parseInput('5 add 3')).toEqual({ operand1: 5, operand2: 3, operation: '+' });
      expect(parseInput('10 subtract 4')).toEqual({ operand1: 10, operand2: 4, operation: '-' });
      expect(parseInput('6 multiply 7')).toEqual({ operand1: 6, operand2: 7, operation: '*' });
      expect(parseInput('20 divide 4')).toEqual({ operand1: 20, operand2: 4, operation: '/' });
    });

    it('should parse operation aliases', () => {
      expect(parseInput('5 sub 3')).toEqual({ operand1: 5, operand2: 3, operation: '-' });
      expect(parseInput('5 mul 3')).toEqual({ operand1: 5, operand2: 3, operation: '*' });
      expect(parseInput('5 div 3')).toEqual({ operand1: 5, operand2: 3, operation: '/' });
      expect(parseInput('5 x 3')).toEqual({ operand1: 5, operand2: 3, operation: '*' });
    });

    it('should parse decimal numbers', () => {
      expect(parseInput('3.14 + 2.86')).toEqual({ operand1: 3.14, operand2: 2.86, operation: '+' });
    });

    it('should parse negative numbers', () => {
      expect(parseInput('-5 + 3')).toEqual({ operand1: -5, operand2: 3, operation: '+' });
      expect(parseInput('5 + -3')).toEqual({ operand1: 5, operand2: -3, operation: '+' });
    });

    it('should handle case insensitivity', () => {
      // Note: input is lowercased, but numbers must come first
      expect(parseInput('5 ADD 3')).toEqual({ operand1: 5, operand2: 3, operation: '+' });
      expect(parseInput('5 Add 3')).toEqual({ operand1: 5, operand2: 3, operation: '+' });
    });

    it('should return null for invalid inputs', () => {
      expect(parseInput('')).toBeNull();
      expect(parseInput('5 +')).toBeNull();
      expect(parseInput('+ 3')).toBeNull();
      expect(parseInput('five plus three')).toBeNull();
      expect(parseInput('5 % 3')).toBeNull();
    });
  });

  describe('formatResult', () => {
    it('should format result with symbol', () => {
      const input = { operand1: 5, operand2: 3, operation: '+' as Operation };
      expect(formatResult(input, 8)).toBe('5 + 3 = 8');
    });

    it('should format result with word operation', () => {
      const input = { operand1: 10, operand2: 4, operation: 'multiply' as Operation };
      expect(formatResult(input, 40)).toBe('10 Multiply 4 = 40');
    });
  });
});