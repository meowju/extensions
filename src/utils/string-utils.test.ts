/**
 * Tests for string utility functions.
 */
import { describe, it, expect } from 'vitest';
import { capitalize, kebabCase, isEmpty } from './string-utils';

describe('capitalize', () => {
  it('should capitalize the first letter of a lowercase string', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should capitalize the first letter of a single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  it('should handle strings that are already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('should handle empty strings', () => {
    expect(capitalize('')).toBe('');
  });

  it('should handle multi-word strings', () => {
    expect(capitalize('hello world')).toBe('Hello world');
  });

  it('should handle strings with special characters', () => {
    expect(capitalize('!hello')).toBe('!hello');
  });

  it('should handle strings with numbers', () => {
    expect(capitalize('123abc')).toBe('123abc');
  });
});

describe('kebabCase', () => {
  it('should convert camelCase to kebab-case', () => {
    expect(kebabCase('helloWorld')).toBe('hello-world');
  });

  it('should convert spaces to hyphens', () => {
    expect(kebabCase('Hello World')).toBe('hello-world');
  });

  it('should convert underscores to hyphens', () => {
    expect(kebabCase('hello_world')).toBe('hello-world');
  });

  it('should handle already kebab-cased strings', () => {
    expect(kebabCase('hello-world')).toBe('hello-world');
  });

  it('should convert to lowercase', () => {
    expect(kebabCase('HelloWorld')).toBe('hello-world');
  });

  it('should handle empty strings', () => {
    expect(kebabCase('')).toBe('');
  });
});

describe('isEmpty', () => {
  it('should return true for empty strings', () => {
    expect(isEmpty('')).toBe(true);
  });

  it('should return true for whitespace-only strings', () => {
    expect(isEmpty('   ')).toBe(true);
    expect(isEmpty('\t')).toBe(true);
    expect(isEmpty('\n')).toBe(true);
  });

  it('should return false for non-empty strings', () => {
    expect(isEmpty('hello')).toBe(false);
    expect(isEmpty('  hello  ')).toBe(false);
  });

  it('should return true for null', () => {
    expect(isEmpty(null)).toBe(true);
  });

  it('should return true for undefined', () => {
    expect(isEmpty(undefined)).toBe(true);
  });
});