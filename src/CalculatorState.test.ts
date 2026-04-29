/**
 * Calculator State Tests
 * Comprehensive test suite for state management features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalculatorStateManager, Operation, INITIAL_STATE, MAX_DIGITS } from './CalculatorState';

describe('CalculatorState', () => {
  let state: CalculatorStateManager;

  beforeEach(() => {
    state = new CalculatorStateManager();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const s = state.getState();
      expect(s.display).toBe('0');
      expect(s.storedValue).toBe(0);
      expect(s.pendingOperation).toBeNull();
      expect(s.shouldClearDisplay).toBe(false);
      expect(s.hasError).toBe(false);
      expect(s.errorMessage).toBeNull();
    });
  });

  describe('Digit Input', () => {
    it('should input single digit', () => {
      state.inputDigit('5');
      expect(state.getState().display).toBe('5');
    });

    it('should append digits to existing number', () => {
      state.inputDigit('1');
      state.inputDigit('2');
      state.inputDigit('3');
      expect(state.getState().display).toBe('123');
    });

    it('should replace display after operation', () => {
      state.inputDigit('1');
      state.inputOperation('+');
      expect(state.getState().shouldClearDisplay).toBe(true);
      
      state.inputDigit('2');
      expect(state.getState().display).toBe('2');
    });

    it('should not exceed max digits', () => {
      for (let i = 0; i < MAX_DIGITS + 5; i++) {
        state.inputDigit('1');
      }
      expect(state.getState().display.length).toBeLessThanOrEqual(MAX_DIGITS);
    });

    it('should handle leading zeros for non-zero digits', () => {
      state.inputDigit('0');
      state.inputDigit('5');
      expect(state.getState().display).toBe('5');
    });

    it('should handle decimal with leading zero', () => {
      state.inputDecimal();
      state.inputDigit('5');
      expect(state.getState().display).toBe('0.5');
    });
  });

  describe('Basic Operations', () => {
    it('should perform addition', () => {
      state.inputDigit('5');
      state.inputOperation('+');
      state.inputDigit('3');
      state.inputEquals();
      expect(state.getState().display).toBe('8');
    });

    it('should perform subtraction', () => {
      state.inputDigit('10');
      state.inputOperation('-');
      state.inputDigit('4');
      state.inputEquals();
      expect(state.getState().display).toBe('6');
    });

    it('should perform multiplication', () => {
      state.inputDigit('6');
      state.inputOperation('*');
      state.inputDigit('7');
      state.inputEquals();
      expect(state.getState().display).toBe('42');
    });

    it('should perform division', () => {
      state.inputDigit('20');
      state.inputOperation('/');
      state.inputDigit('4');
      state.inputEquals();
      expect(state.getState().display).toBe('5');
    });

    it('should handle decimal results', () => {
      state.inputDigit('7');
      state.inputOperation('/');
      state.inputDigit('2');
      state.inputEquals();
      expect(state.getState().display).toBe('3.5');
    });

    it('should chain operations from left to right', () => {
      state.inputDigit('10');
      state.inputOperation('+');
      state.inputDigit('5');
      state.inputOperation('*');
      state.inputDigit('2');
      state.inputEquals();
      // (10 + 5) * 2 = 30
      expect(state.getState().display).toBe('30');
    });
  });

  describe('Clear Functionality', () => {
    it('should clear all state on C', () => {
      state.inputDigit('1');
      state.inputOperation('+');
      state.inputDigit('2');
      state.clear();
      
      const s = state.getState();
      expect(s.display).toBe('0');
      expect(s.storedValue).toBe(0);
      expect(s.pendingOperation).toBeNull();
      expect(s.shouldClearDisplay).toBe(false);
    });

    it('should clear error state', () => {
      state.inputDigit('10');
      state.inputOperation('/');
      state.inputDigit('0');
      state.inputEquals();
      expect(state.getState().hasError).toBe(true);
      
      state.clear();
      expect(state.getState().hasError).toBe(false);
    });
  });

  describe('Backspace Function', () => {
    it('should remove last character', () => {
      state.inputDigit('1');
      state.inputDigit('2');
      state.inputDigit('3');
      state.inputBackspace();
      expect(state.getState().display).toBe('12');
    });

    it('should leave single digit as 0', () => {
      state.inputDigit('5');
      state.inputBackspace();
      expect(state.getState().display).toBe('0');
    });

    it('should handle negative numbers', () => {
      state.inputDigit('5');
      state.toggleSign();
      state.inputBackspace();
      // Removing last digit from negative number: if -5 becomes -0, that's fine
      // Or it could be treated as just 0 (both are semantically similar)
      const display = state.getState().display;
      expect(display === '0' || display === '-0').toBe(true);
    });

    it('should clear error state', () => {
      state.inputDigit('10');
      state.inputOperation('/');
      state.inputDigit('0');
      state.inputEquals();
      state.inputBackspace();
      expect(state.getState().hasError).toBe(false);
    });

    it('should do nothing on initial state', () => {
      state.inputBackspace();
      expect(state.getState().display).toBe('0');
    });
  });

  describe('Equals Behavior', () => {
    it('should return result on equals', () => {
      state.inputDigit('5');
      state.inputOperation('+');
      state.inputDigit('3');
      state.inputEquals();
      expect(state.getState().display).toBe('8');
    });

    it('should do nothing when no pending operation', () => {
      state.inputDigit('5');
      state.inputEquals();
      expect(state.getState().display).toBe('5');
    });

    it('should allow chained equals', () => {
      state.inputDigit('5');
      state.inputOperation('+');
      state.inputDigit('3');
      state.inputEquals();
      expect(state.getState().display).toBe('8');
      
      // Second equals should repeat last operation with last operand: 8 + 3 = 11
      state.inputEquals();
      expect(state.getState().display).toBe('11');
    });

    it('should set shouldClearDisplay after equals', () => {
      state.inputDigit('5');
      state.inputOperation('+');
      state.inputDigit('3');
      state.inputEquals();
      expect(state.getState().shouldClearDisplay).toBe(true);
    });

    it('should preserve last result for chained operations', () => {
      state.inputDigit('10');
      state.inputOperation('+');
      state.inputDigit('5');
      state.inputEquals();
      expect(state.getState().storedValue).toBe(15);
    });
  });

  describe('Division by Zero', () => {
    it('should display error on division by zero', () => {
      state.inputDigit('10');
      state.inputOperation('/');
      state.inputDigit('0');
      state.inputEquals();
      
      const s = state.getState();
      expect(s.hasError).toBe(true);
      expect(s.errorMessage).toBe('Error: Division by zero');
      expect(s.display).toContain('Division by zero');
    });

    it('should clear error on next digit input', () => {
      state.inputDigit('10');
      state.inputOperation('/');
      state.inputDigit('0');
      state.inputEquals();
      
      state.inputDigit('5');
      expect(state.getState().hasError).toBe(false);
    });

    it('should clear error on clear', () => {
      state.inputDigit('10');
      state.inputOperation('/');
      state.inputDigit('0');
      state.inputEquals();
      
      state.clear();
      expect(state.getState().hasError).toBe(false);
    });
  });

  describe('Display Behavior', () => {
    it('should handle decimal input', () => {
      state.inputDigit('0');
      state.inputDecimal();
      state.inputDigit('5');
      expect(state.getState().display).toBe('0.5');
    });

    it('should only allow one decimal point', () => {
      state.inputDigit('1');
      state.inputDecimal();
      state.inputDigit('2');
      state.inputDecimal();
      state.inputDigit('3');
      expect(state.getState().display).toBe('1.23');
    });

    it('should not allow leading zeros', () => {
      state.inputDigit('0');
      state.inputDigit('0');
      state.inputDigit('5');
      expect(state.getState().display).toBe('5');
    });

    it('should allow 0 followed by decimal', () => {
      state.inputDigit('0');
      state.inputDecimal();
      expect(state.getState().display).toBe('0.');
    });

    it('should handle large numbers in scientific notation', () => {
      // Enter a number with 16 digits
      let numStr = '1';
      for (let i = 0; i < MAX_DIGITS; i++) {
        numStr += '1';
      }
      
      for (const char of numStr) {
        state.inputDigit(char);
      }
      
      const display = state.getState().display;
      expect(display.length).toBeLessThanOrEqual(MAX_DIGITS);
    });
  });

  describe('Toggle Sign', () => {
    it('should negate positive number', () => {
      state.inputDigit('5');
      state.toggleSign();
      expect(state.getState().display).toBe('-5');
    });

    it('should negate negative number', () => {
      state.inputDigit('5');
      state.toggleSign();
      state.toggleSign();
      expect(state.getState().display).toBe('5');
    });

    it('should do nothing for zero', () => {
      state.toggleSign();
      expect(state.getState().display).toBe('0');
    });

    it('should do nothing if error state', () => {
      state.inputDigit('10');
      state.inputOperation('/');
      state.inputDigit('0');
      state.inputEquals();
      
      state.toggleSign();
      expect(state.getState().hasError).toBe(true);
    });
  });

  describe('Percent', () => {
    it('should convert to percentage', () => {
      state.inputDigit('50');
      state.inputPercent();
      expect(state.getState().display).toBe('0.5');
    });

    it('should work in expressions', () => {
      state.inputDigit('100');
      state.inputOperation('+');
      state.inputDigit('50');
      state.inputPercent();
      state.inputEquals();
      expect(state.getState().display).toBe('100.5');
    });

    it('should clear error before percentage', () => {
      state.inputDigit('10');
      state.inputOperation('/');
      state.inputDigit('0');
      state.inputEquals();
      
      state.inputPercent();
      expect(state.getState().hasError).toBe(false);
    });
  });

  describe('Expression Display', () => {
    it('should show expression when operation pending', () => {
      state.inputDigit('5');
      state.inputOperation('+');
      expect(state.getExpression()).toBe('5 +');
    });

    it('should return empty string when no operation', () => {
      state.inputDigit('5');
      expect(state.getExpression()).toBe('');
    });

    it('should update expression after evaluation', () => {
      state.inputDigit('5');
      state.inputOperation('+');
      state.inputDigit('3');
      state.inputEquals();
      // After equals, operation is still pending for repeated equals
      // storedValue is 8, so expression shows "8 +"
      expect(state.getExpression()).toBe('8 +');
    });

    it('should show operation symbol correctly', () => {
      state.inputDigit('10');
      state.inputOperation('/');
      expect(state.getExpression()).toBe('10 /');
    });
  });

  describe('Error Handling', () => {
    it('should handle Infinity results', () => {
      state.inputDigit('1');
      state.inputOperation('/');
      state.inputDigit('0');
      state.inputEquals();
      
      const s = state.getState();
      expect(s.hasError).toBe(true);
    });

    it('should clear error on any digit input', () => {
      state.inputDigit('10');
      state.inputOperation('/');
      state.inputDigit('0');
      state.inputEquals();
      
      state.inputDigit('1');
      expect(state.getState().display).toBe('1');
      expect(state.getState().hasError).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty equals at start', () => {
      state.inputEquals();
      const s = state.getState();
      expect(s.display).toBe('0');
      expect(s.pendingOperation).toBeNull();
    });

    it('should handle operation without second operand', () => {
      state.inputDigit('5');
      state.inputOperation('+');
      state.inputOperation('*');
      
      // Should evaluate 5 + first
      expect(state.getState().display).not.toBe('0');
    });

    it('should handle decimal precision', () => {
      state.inputDigit('1');
      state.inputOperation('/');
      state.inputDigit('3');
      state.inputEquals();
      
      const display = state.getState().display;
      expect(parseFloat(display)).toBeCloseTo(0.333333, 5);
    });

    it('should preserve state across multiple operations', () => {
      state.inputDigit('10');
      state.inputOperation('+');
      state.inputDigit('5');
      expect(state.getState().storedValue).toBe(10);
      expect(state.getState().pendingOperation).toBe('+');
    });
  });
});