import { divide } from './divide';

describe('divide', () => {
  it('should divide two positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('should handle floating-point results', () => {
    expect(divide(7, 2)).toBe(3.5);
  });

  it('should handle negative numbers', () => {
    expect(divide(-6, 3)).toBe(-2);
    expect(divide(6, -3)).toBe(-2);
    expect(divide(-6, -3)).toBe(2);
  });

  it('should handle zero dividend', () => {
    expect(divide(0, 5)).toBe(0);
  });

  it('should throw on division by zero', () => {
    expect(() => divide(5, 0)).toThrow('Division by zero');
    expect(() => divide(0, 0)).toThrow('Division by zero');
    expect(() => divide(-5, 0)).toThrow('Division by zero');
  });

  it('should handle floating-point numbers', () => {
    expect(divide(0.5, 0.25)).toBeCloseTo(2, 10);
  });

  it('should handle large numbers', () => {
    expect(divide(1_000_000, 2)).toBe(500_000);
  });

  it('should handle one', () => {
    expect(divide(5, 1)).toBe(5);
  });

  it('should return NaN when dividend is NaN', () => {
    expect(divide(NaN, 5)).toBeNaN();
  });

  it('should handle infinity', () => {
    expect(divide(Infinity, 2)).toBe(Infinity);
    expect(divide(Infinity, Infinity)).toBeNaN();
    expect(divide(5, Infinity)).toBe(0);
  });
});