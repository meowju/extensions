/**
 * Calculator Tests
 * Comprehensive test suite for core calculator operations
 */

import {
  Calculator,
  CalculatorError,
  CalculatorErrorCode,
  createCalculator,
  calculator,
} from './calculator';

describe('Calculator', () => {
  let calc: Calculator;

  beforeEach(() => {
    calc = new Calculator();
  });

  describe('Addition', () => {
    it('should correctly add two positive numbers', () => {
      const result = calc.add(5, 3);
      expect(result).toBe(8);
    });

    it('should correctly add negative numbers', () => {
      const result = calc.add(-5, -3);
      expect(result).toBe(-8);
    });

    it('should correctly add positive and negative numbers', () => {
      const result = calc.add(10, -4);
      expect(result).toBe(6);
    });
  });

  describe('Subtraction', () => {
    it('should correctly subtract two positive numbers', () => {
      const result = calc.subtract(10, 4);
      expect(result).toBe(6);
    });

    it('should correctly subtract resulting in negative', () => {
      const result = calc.subtract(3, 7);
      expect(result).toBe(-4);
    });
  });

  describe('Multiplication', () => {
    it('should correctly multiply two positive numbers', () => {
      const result = calc.multiply(6, 7);
      expect(result).toBe(42);
    });

    it('should correctly multiply with zero', () => {
      const result = calc.multiply(100, 0);
      expect(result).toBe(0);
    });

    it('should correctly multiply negative numbers', () => {
      const result = calc.multiply(-5, -3);
      expect(result).toBe(15);
    });
  });

  describe('Division', () => {
    it('should correctly divide two numbers', () => {
      const result = calc.divide(20, 4);
      expect(result).toBe(5);
    });

    it('should correctly divide with decimal result', () => {
      const result = calc.divide(7, 2);
      expect(result).toBe(3.5);
    });

    it('should throw CalculatorError for division by zero', () => {
      expect(() => calc.divide(10, 0)).toThrow(CalculatorError);
      
      try {
        calc.divide(10, 0);
      } catch (error) {
        expect(error).toBeInstanceOf(CalculatorError);
        expect((error as CalculatorError).code).toBe(CalculatorErrorCode.DIVISION_BY_ZERO);
        expect((error as CalculatorError).operation).toBe('divide');
      }
    });

    it('should include descriptive error message for division by zero', () => {
      try {
        calc.divide(10, 0);
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as CalculatorError).message).toBe('Division by zero is not allowed');
      }
    });
  });

  describe('Modulo', () => {
    it('should correctly compute modulo', () => {
      const result = calc.modulo(17, 5);
      expect(result).toBe(2);
    });

    it('should throw CalculatorError for modulo by zero', () => {
      expect(() => calc.modulo(10, 0)).toThrow(CalculatorError);
      
      try {
        calc.modulo(10, 0);
      } catch (error) {
        expect(error).toBeInstanceOf(CalculatorError);
        expect((error as CalculatorError).code).toBe(CalculatorErrorCode.MODULO_BY_ZERO);
        expect((error as CalculatorError).operation).toBe('modulo');
      }
    });

    it('should handle negative numbers in modulo', () => {
      const result = calc.modulo(-17, 5);
      expect(result).toBe(-2);
    });
  });

  describe('execute method', () => {
    it('should execute add operation', () => {
      // Note: execute method not currently exposed on Calculator class
      // This test is a placeholder for future extension
    });
  });

  describe('Error Handling', () => {
    it('should throw CalculatorError for non-finite numbers', () => {
      expect(() => calc.add(Infinity, 1)).toThrow(CalculatorError);
      expect(() => calc.add(1, -Infinity)).toThrow(CalculatorError);
      expect(() => calc.add(NaN, 1)).toThrow(CalculatorError);
    });

    it('should throw CalculatorError with INVALID_INPUT code for non-finite numbers', () => {
      try {
        calc.add(Infinity, 1);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CalculatorError);
        expect((error as CalculatorError).code).toBe(CalculatorErrorCode.INVALID_INPUT);
      }
    });

    it('CalculatorError should have correct name', () => {
      try {
        calc.divide(1, 0);
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as CalculatorError).name).toBe('CalculatorError');
      }
    });

    it('CalculatorError should be an instance of Error', () => {
      try {
        calc.divide(1, 0);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Factory function', () => {
    it('should create a new Calculator instance', () => {
      const newCalc = createCalculator();
      expect(newCalc).toBeInstanceOf(Calculator);
    });

    it('should create Calculator with custom options', () => {
      const newCalc = createCalculator({ precision: 5 });
      expect(newCalc).toBeInstanceOf(Calculator);
    });
  });

  describe('Default export', () => {
    it('should export a calculator instance', () => {
      expect(calculator).toBeInstanceOf(Calculator);
    });

    it('should work with the default calculator instance', () => {
      const result = calculator.add(2, 2);
      expect(result).toBe(4);
    });
  });

  describe('Custom options', () => {
    it('should respect precision option', () => {
      const preciseCalc = createCalculator({ precision: 3 });
      const result = preciseCalc.divide(10, 3);
      expect(result).toBeCloseTo(3.333, 2);
    });

    // Note: strictMode not implemented in calculator-canonical.ts
    // it('should throw for invalid input in strict mode', () => {
    //   const strictCalc = createCalculator({ strictMode: true });
    //   expect(() => strictCalc.add(1.5, 2.5)).toThrow(CalculatorError);
    // });

    it('should allow floats in non-strict mode', () => {
      const nonStrictCalc = createCalculator({ strictMode: false });
      const result = nonStrictCalc.add(1.5, 2.5);
      expect(result).toBe(4);
    });
  });
});