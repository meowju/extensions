import { add, subtract, multiply, divide, isEven, clamp } from '../utils';

describe('Math Utilities', () => {
  describe('add', () => {
    it('should add two numbers correctly', () => {
      expect(add(2, 3)).toBe(5);
      expect(add(-1, 1)).toBe(0);
      expect(add(0, 0)).toBe(0);
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers correctly', () => {
      expect(subtract(5, 3)).toBe(2);
      expect(subtract(1, 1)).toBe(0);
      expect(subtract(0, 5)).toBe(-5);
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers correctly', () => {
      expect(multiply(2, 3)).toBe(6);
      expect(multiply(-2, 3)).toBe(-6);
      expect(multiply(0, 100)).toBe(0);
    });
  });

  describe('divide', () => {
    it('should divide two numbers correctly', () => {
      expect(divide(6, 3)).toBe(2);
      expect(divide(5, 2)).toBe(2.5);
    });

    it('should throw an error when dividing by zero', () => {
      expect(() => divide(1, 0)).toThrow('Cannot divide by zero');
    });
  });

  describe('isEven', () => {
    it('should return true for even numbers', () => {
      expect(isEven(2)).toBe(true);
      expect(isEven(0)).toBe(true);
      expect(isEven(-4)).toBe(true);
    });

    it('should return false for odd numbers', () => {
      expect(isEven(1)).toBe(false);
      expect(isEven(-3)).toBe(false);
    });
  });

  describe('clamp', () => {
    it('should clamp values within the range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });
});
