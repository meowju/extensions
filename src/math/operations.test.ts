import { Calculator } from './operations';

describe('Calculator', () => {
  let calc: Calculator;

  beforeEach(() => {
    calc = new Calculator();
  });

  describe('clear', () => {
    it('should reset calculator to initial state', () => {
      calc.inputDigit('5');
      calc.clear();
      expect(calc.getDisplay()).toBe('0');
    });

    it('should clear after operations', () => {
      calc.inputDigit('1');
      calc.inputOperator('add');
      calc.inputDigit('2');
      calc.clear();
      expect(calc.getDisplay()).toBe('0');
    });
  });

  describe('inputDigit', () => {
    it('should input single digit', () => {
      calc.inputDigit('5');
      expect(calc.getDisplay()).toBe('5');
    });

    it('should append digits', () => {
      calc.inputDigit('1');
      calc.inputDigit('2');
      calc.inputDigit('3');
      expect(calc.getDisplay()).toBe('123');
    });

    it('should ignore non-digit input', () => {
      calc.inputDigit('a');
      expect(calc.getDisplay()).toBe('0');
    });

    it('should limit to 12 digits', () => {
      for (let i = 0; i < 15; i++) {
        calc.inputDigit(String(i % 10));
      }
      expect(calc.getDisplay().length).toBeLessThanOrEqual(12);
    });
  });

  describe('inputDecimal', () => {
    it('should add decimal point', () => {
      calc.inputDecimal();
      expect(calc.getDisplay()).toBe('0.');
    });

    it('should not add second decimal', () => {
      calc.inputDecimal();
      calc.inputDigit('5');
      calc.inputDecimal();
      expect(calc.getDisplay()).toBe('0.5');
    });

    it('should start new number with decimal after operator', () => {
      calc.inputDigit('5');
      calc.inputOperator('add');
      calc.inputDecimal();
      calc.inputDigit('5');
      expect(calc.getDisplay()).toBe('0.5');
    });
  });

  describe('inputOperator', () => {
    it('should store first operand and operator', () => {
      calc.inputDigit('5');
      calc.inputOperator('add');
      expect(calc.getState().operator).toBe('add');
      expect(calc.getState().previousValue).toBe('5');
    });

    it('should replace operator when pressed twice', () => {
      calc.inputDigit('5');
      calc.inputOperator('add');
      calc.inputOperator('multiply');
      expect(calc.getState().operator).toBe('multiply');
    });

    it('should chain operations left-to-right', () => {
      // Basic calculators process left-to-right: (2 + 3) * 4 = 20
      calc.inputDigit('2');
      calc.inputOperator('add');
      calc.inputDigit('3');
      calc.inputOperator('multiply');
      calc.inputDigit('4');
      const result = calc.equals();
      expect(result.success).toBe(true);
      expect(result.value).toBe(20); // (2 + 3) * 4 = 20 (left-to-right)
    });
  });

  describe('equals', () => {
    it('should return current value when no operation pending', () => {
      calc.inputDigit('5');
      const result = calc.equals();
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should add two numbers', () => {
      calc.inputDigit('2');
      calc.inputOperator('add');
      calc.inputDigit('3');
      const result = calc.equals();
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should subtract two numbers', () => {
      calc.inputDigit('5');
      calc.inputOperator('subtract');
      calc.inputDigit('3');
      const result = calc.equals();
      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });

    it('should multiply two numbers', () => {
      calc.inputDigit('4');
      calc.inputOperator('multiply');
      calc.inputDigit('5');
      const result = calc.equals();
      expect(result.success).toBe(true);
      expect(result.value).toBe(20);
    });

    it('should divide two numbers', () => {
      calc.inputDigit('1');
      calc.inputDigit('0');
      calc.inputOperator('divide');
      calc.inputDigit('2');
      const result = calc.equals();
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should handle division by zero', () => {
      calc.inputDigit('5');
      calc.inputOperator('divide');
      calc.inputDigit('0');
      const result = calc.equals();
      expect(result.success).toBe(false);
    });

    it('should handle floating-point results', () => {
      calc.inputDigit('7');
      calc.inputOperator('divide');
      calc.inputDigit('2');
      const result = calc.equals();
      expect(result.success).toBe(true);
      expect(result.value).toBe(3.5);
    });

    it('should allow chaining with equals', () => {
      calc.inputDigit('2');
      calc.inputOperator('add');
      calc.inputDigit('3');
      calc.equals();
      calc.inputOperator('multiply');
      calc.inputDigit('4');
      const result = calc.equals();
      expect(result.success).toBe(true);
      expect(result.value).toBe(20);
    });
  });

  describe('toggleSign', () => {
    it('should toggle positive to negative', () => {
      calc.inputDigit('5');
      calc.toggleSign();
      expect(calc.getDisplay()).toBe('-5');
    });

    it('should toggle negative to positive', () => {
      calc.inputDigit('5');
      calc.toggleSign();
      calc.toggleSign();
      expect(calc.getDisplay()).toBe('5');
    });
  });

  describe('percent', () => {
    it('should divide by 100', () => {
      calc.inputDigit('5');
      calc.inputDigit('0');
      calc.percent();
      expect(calc.getDisplay()).toBe('0.5');
    });
  });

  describe('clearEntry', () => {
    it('should clear current value only', () => {
      calc.inputDigit('5');
      calc.inputOperator('add');
      calc.inputDigit('3');
      calc.clearEntry();
      expect(calc.getDisplay()).toBe('0');
      // Now enter 2 and complete the operation
      calc.inputDigit('2');
      const result = calc.equals();
      expect(result.value).toBe(7); // 5 + 2 = 7
    });
  });
});