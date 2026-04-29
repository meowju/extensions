import { greet } from './index';

describe('greet', () => {
  it('should return a greeting with the given name', () => {
    const result = greet('World');
    expect(result).toBe('Hello, World! Welcome to our TypeScript project.');
  });

  it('should handle different names', () => {
    const result = greet('TypeScript');
    expect(result).toContain('TypeScript');
  });
});
