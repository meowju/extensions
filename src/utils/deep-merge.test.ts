import { describe, it, expect } from 'vitest';
import { deepMerge, deepMergeAll, type DeepPartial } from './deep-merge';

describe('deepMerge', () => {
  describe('basic functionality', () => {
    it('should merge flat objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);
      
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should not mutate the original objects', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      const result = deepMerge(target, source);
      
      expect(target).toEqual({ a: 1 });
      expect(source).toEqual({ b: 2 });
      expect(result).not.toBe(target);
      expect(result).not.toBe(source);
    });

    it('should handle empty source', () => {
      const target = { a: 1, b: 2 };
      const result = deepMerge(target, {});
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle empty target', () => {
      const source = { a: 1, b: 2 };
      const result = deepMerge({}, source);
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('nested object merging', () => {
    it('should recursively merge nested objects', () => {
      const target = { a: 1, b: { c: 2, d: 3 } };
      const source = { b: { c: 5, e: 6 }, f: 7 };
      const result = deepMerge(target, source);
      
      expect(result).toEqual({ a: 1, b: { c: 5, d: 3, e: 6 }, f: 7 });
    });

    it('should replace primitive with object', () => {
      const target = { a: 'string' };
      const source = { a: { nested: true } };
      const result = deepMerge(target, source);
      
      expect(result).toEqual({ a: { nested: true } });
    });

    it('should handle deep nesting', () => {
      const target = { a: { b: { c: { d: 1 } } } };
      const source = { a: { b: { c: { e: 2 } } } };
      const result = deepMerge(target, source);
      
      expect(result).toEqual({ a: { b: { c: { d: 1, e: 2 } } } });
    });
  });

  describe('null and undefined handling', () => {
    it('should preserve null values from source', () => {
      const target = { a: 1, b: 2 };
      const source = { b: null };
      const result = deepMerge(target, source);
      
      expect(result).toEqual({ a: 1, b: null });
    });

    it('should skip undefined source values', () => {
      const target = { a: 1, b: 2 };
      const source = { b: undefined };
      const result = deepMerge(target, source);
      
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should preserve target null values when source has undefined', () => {
      const target = { a: null };
      const source = { a: undefined };
      const result = deepMerge(target, source);
      
      expect(result).toEqual({ a: null });
    });
  });

  describe('non-object type handling', () => {
    it('should throw TypeError for non-object target', () => {
      expect(() => deepMerge(null as any, { a: 1 })).toThrow(TypeError);
      expect(() => deepMerge('string' as any, { a: 1 })).toThrow(TypeError);
    });

    it('should throw TypeError for non-object source', () => {
      expect(() => deepMerge({ a: 1 }, null as any)).toThrow(TypeError);
      expect(() => deepMerge({ a: 1 }, 42 as any)).toThrow(TypeError);
    });

    it('should treat arrays as values (replace, not merge)', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [4, 5] };
      const result = deepMerge(target, source);
      
      expect(result).toEqual({ items: [4, 5] });
    });
  });
});

describe('deepMergeAll', () => {
  it('should merge multiple objects', () => {
    const result = deepMergeAll({ a: 1 }, { b: 2 }, { c: 3 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should give precedence to later sources', () => {
    const result = deepMergeAll({ a: 1 }, { a: 2 }, { a: 3 });
    expect(result).toEqual({ a: 3 });
  });

  it('should handle nested merges', () => {
    const result = deepMergeAll(
      { a: { b: 1, c: 2 } },
      { a: { b: 3 }, d: 4 },
      { a: { e: 5 } }
    );
    expect(result).toEqual({ a: { b: 3, c: 2, e: 5 }, d: 4 });
  });

  it('should return empty object for no arguments', () => {
    const result = deepMergeAll();
    expect(result).toEqual({});
  });
});
