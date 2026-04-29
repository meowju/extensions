import { add } from './add';

describe('add', () => {
  it('should add two positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('should add a positive and negative number', () => {
    expect(add(-1, 1)).toBe(0);
  });

  it('should add two negative numbers', () => {
    expect(add(-5, -3)).toBe(-8);
  });

  it('should handle zero', () => {
    expect(add(0, 5)).toBe(5);
    expect(add(5, 0)).toBe(5);
  });

  it('should handle floating-point numbers', () => {
    expect(add(0.1, 0.2)).toBeCloseTo(0.3, 10);
  });

  it('should handle large numbers', () => {
    expect(add(1_000_000, 2_000_000)).toBe(3_000_000);
  });

  it('should return NaN when either input is NaN', () => {
    expect(add(NaN, 1)).toBeNaN();
    expect(add(1, NaN)).toBeNaN();
  });

  it('should handle infinity', () => {
    expect(add(Infinity, 1)).toBe(Infinity);
    expect(add(Infinity, Infinity)).toBe(Infinity);
    expect(add(-Infinity, Infinity)).toBe(NaN);
  });
});