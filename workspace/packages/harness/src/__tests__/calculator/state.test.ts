/**
 * Tests for calculator state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  CalculatorStateManager, 
  createCalculatorState, 
  INITIAL_STATE,
  DisplayMode 
} from '../calculator/state';

describe('Calculator State Manager', () => {
  let stateManager: CalculatorStateManager;

  beforeEach(() => {
    stateManager = createCalculatorState();
  });

  describe('initial state', () => {
    it('should have correct initial display', () => {
      expect(stateManager.get('display')).toBe('0');
    });

    it('should have zero accumulator', () => {
      expect(stateManager.get('accumulator')).toBe(0);
    });

    it('should have no pending operation', () => {
      expect(stateManager.get('pendingOperation')).toBeNull();
    });

    it('should have zero memory', () => {
      expect(stateManager.get('memory')).toBe(0);
    });

    it('should have empty history', () => {
      expect(stateManager.get('history')).toEqual([]);
    });
  });

  describe('inputDigit', () => {
    it('should replace display when display is 0', () => {
      stateManager.inputDigit('5');
      expect(stateManager.get('display')).toBe('5');
    });

    it('should append digit when display is not 0', () => {
      stateManager.inputDigit('5');
      stateManager.inputDigit('3');
      expect(stateManager.get('display')).toBe('53');
    });

    it('should handle digits after operation', () => {
      stateManager.inputDigit('5');
      stateManager.inputOperator('+');
      stateManager.inputDigit('3');
      expect(stateManager.get('display')).toBe('3');
    });
  });

  describe('inputDecimal', () => {
    it('should add decimal point', () => {
      stateManager.inputDigit('5');
      stateManager.inputDecimal();
      expect(stateManager.get('display')).toBe('5.');
    });

    it('should handle decimal after operation', () => {
      stateManager.inputDigit('5');
      stateManager.inputOperator('+');
      stateManager.inputDecimal();
      expect(stateManager.get('display')).toBe('0.');
    });
  });

  describe('inputOperator', () => {
    it('should set pending operation', () => {
      stateManager.inputDigit('5');
      stateManager.inputOperator('+');
      expect(stateManager.get('pendingOperation')).toBe('+');
    });

    it('should save operand', () => {
      stateManager.inputDigit('5');
      stateManager.inputOperator('+');
      expect(stateManager.get('pendingOperand')).toBe(5);
    });

    it('should update accumulator', () => {
      stateManager.inputDigit('5');
      stateManager.inputOperator('+');
      expect(stateManager.get('accumulator')).toBe(5);
    });
  });

  describe('calculate', () => {
    it('should add two numbers', () => {
      stateManager.inputDigit('5');
      stateManager.inputOperator('+');
      stateManager.inputDigit('3');
      const result = stateManager.calculate();
      expect(result).toBe(8);
    });

    it('should subtract two numbers', () => {
      stateManager.inputDigit('10');
      stateManager.inputOperator('-');
      stateManager.inputDigit('4');
      const result = stateManager.calculate();
      expect(result).toBe(6);
    });

    it('should multiply two numbers', () => {
      stateManager.inputDigit('6');
      stateManager.inputOperator('*');
      stateManager.inputDigit('7');
      const result = stateManager.calculate();
      expect(result).toBe(42);
    });

    it('should divide two numbers', () => {
      stateManager.inputDigit('20');
      stateManager.inputOperator('/');
      stateManager.inputDigit('4');
      const result = stateManager.calculate();
      expect(result).toBe(5);
    });

    it('should return null for division by zero', () => {
      stateManager.inputDigit('10');
      stateManager.inputOperator('/');
      stateManager.inputDigit('0');
      const result = stateManager.calculate();
      expect(result).toBeNull();
      expect(stateManager.get('error')).toContain('zero');
    });
  });

  describe('chained operations', () => {
    it('should chain multiple additions', () => {
      stateManager.inputDigit('1');
      stateManager.inputOperator('+');
      stateManager.inputDigit('2');
      stateManager.inputOperator('+');
      stateManager.inputDigit('3');
      const result = stateManager.calculate();
      expect(result).toBe(6);
    });
  });

  describe('memory operations', () => {
    it('should store value in memory', () => {
      stateManager.inputDigit('42');
      stateManager.memoryStore();
      expect(stateManager.get('memory')).toBe(42);
    });

    it('should add to memory', () => {
      stateManager.inputDigit('10');
      stateManager.memoryStore();
      stateManager.inputDigit('5');
      stateManager.memoryAdd();
      expect(stateManager.get('memory')).toBe(15);
    });

    it('should subtract from memory', () => {
      stateManager.inputDigit('10');
      stateManager.memoryStore();
      stateManager.inputDigit('3');
      stateManager.memorySubtract();
      expect(stateManager.get('memory')).toBe(7);
    });

    it('should clear memory', () => {
      stateManager.inputDigit('42');
      stateManager.memoryStore();
      stateManager.memoryClear();
      expect(stateManager.get('memory')).toBe(0);
    });

    it('should recall memory', () => {
      stateManager.inputDigit('42');
      stateManager.memoryStore();
      stateManager.inputDigit('0');
      stateManager.memoryRecall();
      expect(stateManager.get('display')).toBe('42');
    });
  });

  describe('clear operations', () => {
    it('should clear entry', () => {
      stateManager.inputDigit('5');
      stateManager.inputDigit('5');
      stateManager.clearEntry();
      expect(stateManager.get('display')).toBe('0');
    });

    it('should clear all', () => {
      stateManager.inputDigit('5');
      stateManager.inputOperator('+');
      stateManager.inputDigit('3');
      stateManager.clearAll();
      expect(stateManager.get('display')).toBe('0');
      expect(stateManager.get('pendingOperation')).toBeNull();
    });

    it('should clear history', () => {
      stateManager.inputDigit('5');
      stateManager.inputOperator('+');
      stateManager.inputDigit('3');
      stateManager.calculate();
      stateManager.clearHistory();
      expect(stateManager.get('history')).toEqual([]);
    });
  });

  describe('backspace', () => {
    it('should remove last digit', () => {
      stateManager.inputDigit('5');
      stateManager.inputDigit('5');
      stateManager.backspace();
      expect(stateManager.get('display')).toBe('5');
    });

    it('should revert to 0 when backspacing last digit', () => {
      stateManager.inputDigit('5');
      stateManager.backspace();
      expect(stateManager.get('display')).toBe('0');
    });

    it('should handle negative numbers', () => {
      stateManager.inputDigit('5');
      stateManager.toggleSign();
      stateManager.inputDigit('5');
      stateManager.backspace();
      expect(stateManager.get('display')).toBe('-5');
    });
  });

  describe('toggleSign', () => {
    it('should toggle positive to negative', () => {
      stateManager.inputDigit('5');
      stateManager.toggleSign();
      expect(stateManager.get('display')).toBe('-5');
    });

    it('should toggle negative to positive', () => {
      stateManager.inputDigit('5');
      stateManager.toggleSign();
      stateManager.toggleSign();
      expect(stateManager.get('display')).toBe('5');
    });

    it('should not toggle zero', () => {
      stateManager.toggleSign();
      expect(stateManager.get('display')).toBe('0');
    });
  });

  describe('history', () => {
    it('should record calculations', () => {
      stateManager.inputDigit('5');
      stateManager.inputOperator('+');
      stateManager.inputDigit('3');
      stateManager.calculate();
      
      const history = stateManager.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].expression).toBe('5 + 3');
      expect(history[0].result).toBe(8);
    });

    it('should limit history size', () => {
      // Perform many calculations to exceed limit
      for (let i = 0; i < 60; i++) {
        stateManager.clearAll();
        stateManager.inputDigit(String(i % 10));
        stateManager.inputOperator('+');
        stateManager.inputDigit('1');
        stateManager.calculate();
      }
      
      const history = stateManager.getHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('formatDisplay', () => {
    it('should format large numbers', () => {
      stateManager.inputDigit('1');
      stateManager.inputDigit('2');
      stateManager.inputDigit('3');
      stateManager.inputDigit('4');
      stateManager.inputDigit('5');
      stateManager.inputDigit('6');
      stateManager.inputDigit('7');
      stateManager.inputDigit('8');
      stateManager.inputDigit('9');
      stateManager.inputDigit('0');
      expect(stateManager.get('display')).toBe('1234567890');
    });

    it('should handle decimal display', () => {
      stateManager.update({ displayMode: DisplayMode.DECIMAL });
      const display = stateManager.formatDisplay(123.456);
      expect(display).toBe('123.456');
    });
  });
});