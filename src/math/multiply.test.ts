import { multiply } from './multiply';

describe('multiply', () => {
  it('should multiply two positive numbers', () => {
    expect(multiply(4, 5)).toBe(20);
  });

  it('should handle negative result', () => {
    expect(multiply(-2, 3)).toBe(-6);
    expect(multiply(2, -3)).toBe(-6);
    expect(multiply(-2, -3)).toBe(6);
  });

  it('should handle zero', () => {
    expect(multiply(0, 5)).toBe(0);
    expect(multiply(5, 0)).toBe(0);
    expect(multiply(0, 0)).toBe(0);
  });

  it('should handle floating-point numbers', () => {
    expect(multiply(0.1, 0.2)).toBeCloseTo(0.02, 10);
  });

  it('should handle large numbers', () => {
    expect(multiply(1000, 2000)).toBe(2_000_000);
  });

  it('should handle one', () => {
    expect(multiply(1, 5)).toBe(5);
    expect(multiply(5, 1)).toBe(5);
  });

  it('should return NaN when either input is NaN', () => {
    expect(multiply(NaN, 1)).toBeNaN();
    expect(multiply(1, NaN)).toBeNaN();
  });

  it('should handle infinity', () => {
    expect(multiply(Infinity, 2)).toBe(Infinity);
    expect(multiply(Infinity, 0)).toBeNaN();
    expect(multiply(Infinity, -1)).toBe(-Infinity);
  });
});