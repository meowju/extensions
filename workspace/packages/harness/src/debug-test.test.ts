import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionParser, EvalResult } from './expression-engine';

describe('Debug Test', () => {
  let parser: ExpressionParser;

  beforeEach(() => {
    parser = new ExpressionParser();
  });

  it('should add two positive numbers', () => {
    const result = parser.evaluate('2 + 3');
    console.log('Result:', JSON.stringify(result, null, 2));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe(5);
    }
  });
});
