/**
 * Tests for main Calculator class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Calculator, createCalculator } from '../calculator/calculator';

describe('Calculator', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = createCalculator();
  });

  describe('initial state', () => {
    it('should start with display at 0', () => {
      expect(calculator.getDisplay()).toBe('0');
    });

    it('should create calculator instance', () => {
      const calc = createCalculator();
      expect(calc).toBeInstanceOf(Calculator);
    });
  });

  describe('digit input', () => {
    it('should input single digit', () => {
      calculator.digit('5');
      expect(calculator.getDisplay()).toBe('5');
    });

    it('should input multiple digits', () => {
      calculator.digit('1');
      calculator.digit('2');
      calculator.digit('3');
      expect(calculator.getDisplay()).toBe('123');
    });

    it('should ignore non-digit input', () => {
      calculator.digit('a');
      expect(calculator.getDisplay()).toBe('0');
    });
  });

  describe('decimal input', () => {
    it('should add decimal point', () => {
      calculator.digit('5');
      calculator.decimal();
      calculator.digit('2');
      expect(calculator.getDisplay()).toBe('5.2');
    });
  });

  describe('basic calculations', () => {
    it('should perform addition', () => {
      calculator.digit('5');
      calculator.operator('+');
      calculator.digit('3');
      const result = calculator.equals();
      expect(result).toEqual({ success: true, value: 8 });
    });

    it('should perform subtraction', () => {
      calculator.digit('10');
      calculator.operator('-');
      calculator.digit('4');
      const result = calculator.equals();
      expect(result).toEqual({ success: true, value: 6 });
    });

    it('should perform multiplication', () => {
      calculator.digit('6');
      calculator.operator('*');
      calculator.digit('7');
      const result = calculator.equals();
      expect(result).toEqual({ success: true, value: 42 });
    });

    it('should perform division', () => {
      calculator.digit('20');
      calculator.operator('/');
      calculator.digit('4');
      const result = calculator.equals();
      expect(result).toEqual({ success: true, value: 5 });
    });

    it('should perform power', () => {
      calculator.digit('2');
      calculator.operator('^');
      calculator.digit('8');
      const result = calculator.equals();
      expect(result).toEqual({ success: true, value: 256 });
    });
  });

  describe('operator precedence', () => {
    it('should multiply before add', () => {
      calculator.digit('2');
      calculator.operator('+');
      calculator.digit('3');
      calculator.operator('*');
      calculator.digit('4');
      const result = calculator.equals();
      expect(result).toEqual({ success: true, value: 14 });
    });

    it('should handle power precedence', () => {
      calculator.digit('2');
      calculator.operator('*');
      calculator.digit('3');
      calculator.operator('^');
      calculator.digit('2');
      const result = calculator.equals();
      expect(result).toEqual({ success: true, value: 18 }); // 2 * 9 = 18
    });
  });

  describe('clear operations', () => {
    it('should clear entry', () => {
      calculator.digit('5');
      calculator.digit('5');
      calculator.clearEntry();
      expect(calculator.getDisplay()).toBe('0');
    });

    it('should clear all', () => {
      calculator.digit('5');
      calculator.operator('+');
      calculator.digit('3');
      calculator.clearAll();
      expect(calculator.getDisplay()).toBe('0');
    });
  });

  describe('backspace', () => {
    it('should delete last character', () => {
      calculator.digit('5');
      calculator.digit('5');
      calculator.backspace();
      expect(calculator.getDisplay()).toBe('5');
    });
  });

  describe('toggleSign', () => {
    it('should toggle positive to negative', () => {
      calculator.digit('5');
      calculator.toggleSign();
      expect(calculator.getDisplay()).toBe('-5');
    });
  });

  describe('evaluate string expression', () => {
    it('should evaluate simple expression', () => {
      const result = calculator.evaluate('2 + 3');
      expect(result).toEqual({ success: true, value: 5 });
    });

    it('should evaluate complex expression', () => {
      const result = calculator.evaluate('(2 + 3) * 4');
      expect(result).toEqual({ success: true, value: 20 });
    });

    it('should evaluate with precedence', () => {
      const result = calculator.evaluate('2 + 3 * 4');
      expect(result).toEqual({ success: true, value: 14 });
    });

    it('should handle unary minus', () => {
      const result = calculator.evaluate('-5 + 3');
      expect(result).toEqual({ success: true, value: -2 });
    });

    it('should return error for invalid expression', () => {
      const result = calculator.evaluate('2 +');
      expect(result.success).toBe(false);
    });

    it('should return error for division by zero', () => {
      const result = calculator.evaluate('10 / 0');
      expect(result.success).toBe(false);
    });
  });

  describe('memory operations', () => {
    it('should store and recall memory', () => {
      calculator.digit('42');
      calculator.memoryStore();
      calculator.clearAll();
      calculator.memoryRecall();
      expect(calculator.getDisplay()).toBe('42');
    });

    it('should add to memory', () => {
      calculator.digit('10');
      calculator.memoryStore();
      calculator.clearAll();
      calculator.digit('5');
      calculator.memoryAdd();
      const state = calculator.getState();
      expect(state.memory).toBe(15);
    });

    it('should clear memory', () => {
      calculator.digit('42');
      calculator.memoryStore();
      calculator.memoryClear();
      const state = calculator.getState();
      expect(state.memory).toBe(0);
    });
  });

  describe('history', () => {
    it('should record calculations', () => {
      calculator.digit('5');
      calculator.operator('+');
      calculator.digit('3');
      calculator.equals();
      
      const history = calculator.getHistory();
      expect(history.length).toBe(1);
    });

    it('should clear history', () => {
      calculator.digit('5');
      calculator.operator('+');
      calculator.digit('3');
      calculator.equals();
      calculator.clearHistory();
      expect(calculator.getHistory()).toEqual([]);
    });
  });
});