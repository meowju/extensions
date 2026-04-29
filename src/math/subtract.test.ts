import { subtract } from './subtract';

describe('subtract', () => {
  it('should subtract two positive numbers', () => {
    expect(subtract(5, 3)).toBe(2);
  });

  it('should handle negative result', () => {
    expect(subtract(3, 5)).toBe(-2);
  });

  it('should subtract positive and negative numbers', () => {
    expect(subtract(-1, 1)).toBe(-2);
    expect(subtract(5, -3)).toBe(8);
  });

  it('should handle zero', () => {
    expect(subtract(0, 5)).toBe(-5);
    expect(subtract(5, 0)).toBe(5);
    expect(subtract(0, 0)).toBe(0);
  });

  it('should handle floating-point numbers', () => {
    expect(subtract(0.5, 0.3)).toBeCloseTo(0.2, 10);
  });

  it('should handle large numbers', () => {
    expect(subtract(1_000_000, 500_000)).toBe(500_000);
  });

  it('should return NaN when either input is NaN', () => {
    expect(subtract(NaN, 1)).toBeNaN();
    expect(subtract(1, NaN)).toBeNaN();
  });

  it('should handle infinity', () => {
    expect(subtract(Infinity, 1)).toBe(Infinity);
    expect(subtract(Infinity, Infinity)).toBeNaN();
    expect(subtract(-Infinity, Infinity)).toBe(-Infinity);
  });
});