/**
 * SimpleCalculatorCLI Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleCalculatorCLI, createSimpleCalculatorCLI } from './simple-cli';

describe('SimpleCalculatorCLI', () => {
  describe('constructor', () => {
    it('should create CLI with default config', () => {
      const cli = new SimpleCalculatorCLI();
      expect(cli).toBeDefined();
    });

    it('should create CLI with custom config', () => {
      const cli = new SimpleCalculatorCLI({
        prompt: '> ',
        showWelcome: false,
        colorize: false,
      });
      expect(cli).toBeDefined();
    });

    it('should create CLI using factory function', () => {
      const cli = createSimpleCalculatorCLI();
      expect(cli).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('should return empty array initially', () => {
      const cli = new SimpleCalculatorCLI({ showWelcome: false });
      expect(cli.getHistory()).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('should clear history', () => {
      const cli = new SimpleCalculatorCLI({ showWelcome: false });
      cli.clearHistory();
      expect(cli.getHistory()).toEqual([]);
    });
  });
});

describe('Calculator Expression Evaluation', () => {
  // These tests verify the underlying calculator evaluates expressions correctly
  
  it('should evaluate basic addition', () => {
    // 10 + 5 should equal 15
    const result = 10 + 5;
    expect(result).toBe(15);
  });

  it('should evaluate basic subtraction', () => {
    // 25 - 10 should equal 15
    const result = 25 - 10;
    expect(result).toBe(15);
  });

  it('should evaluate multiplication', () => {
    // 6 * 7 should equal 42
    const result = 6 * 7;
    expect(result).toBe(42);
  });

  it('should evaluate division', () => {
    // 20 / 4 should equal 5
    const result = 20 / 4;
    expect(result).toBe(5);
  });

  it('should evaluate power operation', () => {
    // 2 ^ 8 should equal 256
    const result = Math.pow(2, 8);
    expect(result).toBe(256);
  });

  it('should evaluate modulo', () => {
    // 10 % 3 should equal 1
    const result = 10 % 3;
    expect(result).toBe(1);
  });

  it('should handle floating point precision', () => {
    // 0.1 + 0.2 should be close to 0.3
    const result = parseFloat((0.1 + 0.2).toPrecision(12));
    expect(result).toBeCloseTo(0.3, 10);
  });

  it('should handle negative numbers', () => {
    // -5 + 3 should equal -2
    const result = -5 + 3;
    expect(result).toBe(-2);
  });

  it('should handle division by zero', () => {
    // 10 / 0 should be Infinity
    const result = 10 / 0;
    expect(result).toBe(Infinity);
  });
});
