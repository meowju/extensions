/**
 * Calculator Tests
 */

import { describe, expect, test } from 'bun:test';
import { calculate, CalculatorError } from './calculator';

describe('Calculator', () => {
  describe('Basic Operations', () => {
    test('addition', () => {
      expect(calculate('2 + 2')).toBe(4);
      expect(calculate('10 + 20')).toBe(30);
      expect(calculate('0.5 + 0.5')).toBe(1);
    });

    test('subtraction', () => {
      expect(calculate('5 - 3')).toBe(2);
      expect(calculate('10 - 20')).toBe(-10);
      expect(calculate('100 - 1')).toBe(99);
    });

    test('multiplication', () => {
      expect(calculate('3 * 4')).toBe(12);
      expect(calculate('0 * 100')).toBe(0);
      expect(calculate('-2 * 5')).toBe(-10);
    });

    test('division', () => {
      expect(calculate('10 / 2')).toBe(5);
      expect(calculate('7 / 2')).toBe(3.5);
      expect(calculate('100 / 10')).toBe(10);
    });

    test('modulo', () => {
      expect(calculate('10 % 3')).toBe(1);
      expect(calculate('20 % 7')).toBe(6);
      expect(calculate('15 % 5')).toBe(0);
    });
  });

  describe('Operator Precedence', () => {
    test('multiplication before addition', () => {
      expect(calculate('2 + 3 * 4')).toBe(14);
      expect(calculate('10 - 2 * 3')).toBe(4);
    });

    test('division before subtraction', () => {
      expect(calculate('10 / 2 + 3')).toBe(8);
    });

    test('parentheses override precedence', () => {
      expect(calculate('(2 + 3) * 4')).toBe(20);
      expect(calculate('(10 - 2) * 3')).toBe(24);
    });
  });

  describe('Exponentiation', () => {
    test('basic power', () => {
      expect(calculate('2 ^ 3')).toBe(8);
      expect(calculate('2 ^ 0')).toBe(1);
      expect(calculate('10 ^ 2')).toBe(100);
    });

    test('right associativity', () => {
      expect(calculate('2 ^ 3 ^ 2')).toBe(512); // 2^(3^2) = 2^9 = 512
    });
  });

  describe('Unary Minus', () => {
    test('negative numbers', () => {
      expect(calculate('-5')).toBe(-5);
      expect(calculate('-10 + 5')).toBe(-5);
      expect(calculate('5 + -10')).toBe(-5);
    });

    test('double negative', () => {
      expect(calculate('--5')).toBe(5);
      expect(calculate('10 + --5')).toBe(15);
    });
  });

  describe('Functions', () => {
    test('trigonometric', () => {
      expect(calculate('sin(0)')).toBeCloseTo(0);
      expect(calculate('cos(0)')).toBeCloseTo(1);
      expect(calculate('tan(0)')).toBeCloseTo(0);
    });

    test('sqrt', () => {
      expect(calculate('sqrt(4)')).toBe(2);
      expect(calculate('sqrt(9)')).toBe(3);
      expect(calculate('sqrt(2)')).toBeCloseTo(1.41421356, 5);
    });

    test('abs', () => {
      expect(calculate('abs(-5)')).toBe(5);
      expect(calculate('abs(5)')).toBe(5);
      expect(calculate('abs(0)')).toBe(0);
    });

    test('logarithmic', () => {
      expect(calculate('log(1)')).toBe(0);
      expect(calculate('log(e)')).toBeCloseTo(1, 5);
      expect(calculate('log10(100)')).toBe(2);
    });

    test('rounding', () => {
      expect(calculate('floor(3.7)')).toBe(3);
      expect(calculate('ceil(3.2)')).toBe(4);
      expect(calculate('round(3.5)')).toBe(4);
      expect(calculate('round(3.4)')).toBe(3);
    });
  });

  describe('Constants', () => {
    test('PI', () => {
      expect(calculate('pi')).toBeCloseTo(Math.PI, 10);
      expect(calculate('2 * pi')).toBeCloseTo(2 * Math.PI, 10);
    });

    test('E', () => {
      expect(calculate('e')).toBeCloseTo(Math.E, 10);
      expect(calculate('e ^ 1')).toBeCloseTo(Math.E, 10);
    });
  });

  describe('Complex Expressions', () => {
    test('nested parentheses', () => {
      expect(calculate('((2 + 3) * (4 - 1))')).toBe(15);
      expect(calculate('((1 + 2) + (3 + 4))')).toBe(10);
    });

    test('functions with expressions', () => {
      expect(calculate('sqrt(2 + 2)')).toBeCloseTo(2);
      expect(calculate('sin(pi / 2)')).toBeCloseTo(1);
    });

    test('combined operations', () => {
      expect(calculate('2 + 3 * 4 / 2 - 1')).toBe(7);
      expect(calculate('(2 + 3) * (4 / 2) - 1')).toBe(9);
    });
  });

  describe('Errors', () => {
    test('division by zero', () => {
      expect(() => calculate('10 / 0')).toThrow(CalculatorError);
      expect(() => calculate('10 % 0')).toThrow(CalculatorError);
    });

    test('empty expression', () => {
      expect(() => calculate('')).toThrow(CalculatorError);
      expect(() => calculate('   ')).toThrow(CalculatorError);
    });

    test('unknown function', () => {
      expect(() => calculate('unknown(5)')).toThrow(CalculatorError);
    });

    test('missing parenthesis', () => {
      expect(() => calculate('(2 + 3')).toThrow(CalculatorError);
      expect(() => calculate('2 + 3)')).toThrow(CalculatorError);
    });

    test('invalid syntax', () => {
      expect(() => calculate('++5')).toThrow(CalculatorError);
      expect(() => calculate('2 + * 3')).toThrow(CalculatorError);
    });
  });
});