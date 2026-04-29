import { describe, it, expect } from 'vitest';
import { hello } from './hello';

describe('hello', () => {
  it('greets with default name', () => {
    expect(hello()).toBe('Hello, World!');
  });

  it('greets with custom name', () => {
    expect(hello('Alice')).toBe('Hello, Alice!');
  });

  it('handles empty string', () => {
    expect(hello('')).toBe('Hello, !');
  });
});