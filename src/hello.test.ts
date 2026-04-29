/**
 * Tests for the hello function
 */
import { describe, it, expect, vi } from 'vitest';
import { hello } from './hello';

describe('hello', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('default behavior (no print)', () => {
    it('should return a greeting result object', () => {
      const result = hello();
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('name');
    });

    it('should have "Hello, World!" as the default message', () => {
      const { message } = hello();
      expect(message).toBe('Hello, World!');
    });

    it('should have "World" as the default name', () => {
      const { name } = hello();
      expect(name).toBe('World');
    });

    it('should not print to console by default', () => {
      hello();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('with print option', () => {
    it('should print "Hello, World!" when print is true', () => {
      hello({ print: true });
      expect(consoleLogSpy).toHaveBeenCalledWith('Hello, World!');
    });

    it('should only print once', () => {
      hello({ print: true });
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should still return the result object when printing', () => {
      const result = hello({ print: true });
      expect(result.message).toBe('Hello, World!');
      expect(result.name).toBe('World');
    });
  });

  describe('with custom name', () => {
    it('should greet custom name', () => {
      const { message } = hello({ name: 'Alice' });
      expect(message).toBe('Hello, Alice!');
    });

    it('should include custom name in result', () => {
      const { name } = hello({ name: 'Bob' });
      expect(name).toBe('Bob');
    });

    it('should print custom greeting when both options set', () => {
      hello({ name: 'Charlie', print: true });
      expect(consoleLogSpy).toHaveBeenCalledWith('Hello, Charlie!');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string name', () => {
      const { message } = hello({ name: '' });
      expect(message).toBe('Hello, !');
    });

    it('should handle single character name', () => {
      const { message } = hello({ name: 'X' });
      expect(message).toBe('Hello, X!');
    });

    it('should handle multi-word name', () => {
      const { message } = hello({ name: 'John Doe' });
      expect(message).toBe('Hello, John Doe!');
    });

    it('should handle whitespace-only name', () => {
      const { message } = hello({ name: '   ' });
      expect(message).toBe('Hello,    !');
    });
  });
});