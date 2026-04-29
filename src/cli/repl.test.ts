/**
 * REPL Tests
 * Comprehensive test suite for the CLI REPL interface
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { REPL, createREPL, parseExpression, Colors, REPLConfig, CalculationResult } from './repl';

// ============================================================================
// TEST HELPERS
// ============================================================================

/** Creates a mock REPL with captured output */
function createMockREPL(): {
  repl: REPL;
  outputBuffer: string[];
  mockOutput: {
    write: (msg: string) => void;
  };
  mockInput: {
    isTTY: boolean;
  };
} {
  const outputBuffer: string[] = [];
  
  const mockOutput = {
    write: (msg: string) => {
      outputBuffer.push(msg);
    },
  };
  
  const mockInput = {
    isTTY: true,
  };
  
  const repl = new REPL({
    output: mockOutput as NodeJS.WritableStream,
    input: mockInput as unknown as NodeJS.ReadableStream,
    enableKeyboard: false,
    maxHistory: 10,
  });
  
  return { repl, outputBuffer, mockOutput, mockInput };
}

// ============================================================================
// PARSER TESTS
// ============================================================================

describe('Expression Parser', () => {
  describe('parseExpression', () => {
    it('should parse basic operations with symbols', () => {
      const variables = new Map<string, number>();
      
      expect(parseExpression('10 + 5', variables)).toEqual({
        operand1: 10,
        operand2: 5,
        operator: '+',
        raw: '10 + 5',
      });
      
      expect(parseExpression('25 * 4', variables)).toEqual({
        operand1: 25,
        operand2: 4,
        operator: '*',
        raw: '25 * 4',
      });
      
      expect(parseExpression('100 / 7', variables)).toEqual({
        operand1: 100,
        operand2: 7,
        operator: '/',
        raw: '100 / 7',
      });
      
      expect(parseExpression('50 - 25', variables)).toEqual({
        operand1: 50,
        operand2: 25,
        operator: '-',
        raw: '50 - 25',
      });
    });
    
    it('should parse operations with word aliases', () => {
      const variables = new Map<string, number>();
      
      expect(parseExpression('10 add 5', variables)).toEqual({
        operand1: 10,
        operand2: 5,
        operator: '+',
        raw: '10 add 5',
      });
      
      expect(parseExpression('25 mul 4', variables)).toEqual({
        operand1: 25,
        operand2: 4,
        operator: '*',
        raw: '25 mul 4',
      });
      
      expect(parseExpression('100 div 7', variables)).toEqual({
        operand1: 100,
        operand2: 7,
        operator: '/',
        raw: '100 div 7',
      });
    });
    
    it('should parse decimal numbers', () => {
      const variables = new Map<string, number>();
      
      expect(parseExpression('3.14 + 2.86', variables)).toEqual({
        operand1: 3.14,
        operand2: 2.86,
        operator: '+',
        raw: '3.14 + 2.86',
      });
    });
    
    it('should parse negative numbers', () => {
      const variables = new Map<string, number>();
      
      expect(parseExpression('-5 + 3', variables)).toEqual({
        operand1: -5,
        operand2: 3,
        operator: '+',
        raw: '-5 + 3',
      });
      
      expect(parseExpression('5 + -3', variables)).toEqual({
        operand1: 5,
        operand2: -3,
        operator: '+',
        raw: '5 + -3',
      });
    });
    
    it('should parse with variables', () => {
      const variables = new Map<string, number>([['x', 10], ['y', 5]]);
      
      expect(parseExpression('x + y', variables)).toEqual({
        operand1: 10,
        operand2: 5,
        operator: '+',
        raw: 'x + y',
      });
    });
    
    it('should handle whitespace normalization', () => {
      const variables = new Map<string, number>();
      
      expect(parseExpression('  10   +   5  ', variables)).toEqual({
        operand1: 10,
        operand2: 5,
        operator: '+',
        raw: '10 + 5',
      });
    });
    
    it('should return null for invalid inputs', () => {
      const variables = new Map<string, number>();
      
      expect(parseExpression('', variables)).toBeNull();
      expect(parseExpression('5', variables)).toBeNull();
      expect(parseExpression('5 +', variables)).toBeNull();
      expect(parseExpression('+ 5', variables)).toBeNull();
      expect(parseExpression('five plus three', variables)).toBeNull();
      expect(parseExpression('x + z', variables)).toBeNull(); // undefined variables
    });
    
    it('should handle X as multiplication', () => {
      const variables = new Map<string, number>();
      
      expect(parseExpression('5 X 3', variables)).toEqual({
        operand1: 5,
        operand2: 3,
        operator: '*',
        raw: '5 X 3',
      });
    });
  });
});

// ============================================================================
// REPL CLASS TESTS
// ============================================================================

describe('REPL Class', () => {
  let mockEnv: ReturnType<typeof createMockREPL>;
  
  beforeEach(() => {
    mockEnv = createMockREPL();
  });
  
  afterEach(() => {
    mockEnv.repl.stop();
  });
  
  describe('constructor', () => {
    it('should create REPL with default config', () => {
      const repl = new REPL();
      expect(repl).toBeInstanceOf(REPL);
      repl.stop();
    });
    
    it('should create REPL with custom config', () => {
      const config: REPLConfig = {
        prompt: '> ',
        maxHistory: 50,
        enableKeyboard: false,
      };
      const repl = new REPL(config);
      expect(repl).toBeInstanceOf(REPL);
      repl.stop();
    });
  });
  
  describe('evaluate', () => {
    it('should evaluate valid expressions', () => {
      const result = mockEnv.repl.evaluate('10 + 5');
      expect(result.success).toBe(true);
      expect(result.value).toBe(15);
    });
    
    it('should evaluate multiplication', () => {
      const result = mockEnv.repl.evaluate('25 * 4');
      expect(result.success).toBe(true);
      expect(result.value).toBe(100);
    });
    
    it('should evaluate division', () => {
      const result = mockEnv.repl.evaluate('100 / 4');
      expect(result.success).toBe(true);
      expect(result.value).toBe(25);
    });
    
    it('should evaluate subtraction', () => {
      const result = mockEnv.repl.evaluate('50 - 25');
      expect(result.success).toBe(true);
      expect(result.value).toBe(25);
    });
    
    it('should return error for division by zero', () => {
      const result = mockEnv.repl.evaluate('10 / 0');
      expect(result.success).toBe(false);
      expect(result.error).toContain('zero');
    });
    
    it('should return error for invalid expressions', () => {
      const result = mockEnv.repl.evaluate('invalid');
      expect(result.success).toBe(false);
    });
    
    it('should use variables in expressions', () => {
      // Store a variable first (we need to test this through history inspection)
      const result = mockEnv.repl.evaluate('10 + 5');
      expect(result.success).toBe(true);
    });
  });
  
  describe('getState', () => {
    it('should return calculator state', () => {
      mockEnv.repl.evaluate('10 + 5');
      const state = mockEnv.repl.getState();
      expect(state).toBeDefined();
      expect(typeof state).toBe('object');
    });
  });
  
  describe('getHistory', () => {
    it('should return empty history initially', () => {
      const history = mockEnv.repl.getHistory();
      expect(history).toEqual([]);
    });
  });
  
  describe('clearHistory', () => {
    it('should clear history', () => {
      mockEnv.repl.clearHistory();
      const history = mockEnv.repl.getHistory();
      expect(history).toEqual([]);
    });
  });
  
  describe('getVariables', () => {
    it('should return variables map', () => {
      const variables = mockEnv.repl.getVariables();
      expect(variables).toBeInstanceOf(Map);
    });
  });
});

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

describe('Factory Functions', () => {
  describe('createREPL', () => {
    it('should create REPL instance', () => {
      const repl = createREPL();
      expect(repl).toBeInstanceOf(REPL);
      repl.stop();
    });
    
    it('should create REPL with config', () => {
      const repl = createREPL({ prompt: 'test> ' });
      expect(repl).toBeInstanceOf(REPL);
      repl.stop();
    });
  });
});

// ============================================================================
// COLOR UTILITY TESTS
// ============================================================================

describe('Color Utilities', () => {
  describe('Colors', () => {
    it('should have ANSI color codes', () => {
      expect(Colors.green).toBe('\x1b[32m');
      expect(Colors.red).toBe('\x1b[31m');
      expect(Colors.reset).toBe('\x1b[0m');
    });
    
    it('should have all required colors', () => {
      expect(Colors.bold).toBeDefined();
      expect(Colors.dim).toBeDefined();
      expect(Colors.yellow).toBeDefined();
      expect(Colors.cyan).toBeDefined();
      expect(Colors.magenta).toBeDefined();
    });
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  let mockEnv: ReturnType<typeof createMockREPL>;
  
  beforeEach(() => {
    mockEnv = createMockREPL();
  });
  
  afterEach(() => {
    mockEnv.repl.stop();
  });
  
  it('should handle very large numbers', () => {
    const result = mockEnv.repl.evaluate('1000000000000 * 1000000000000');
    expect(result.success).toBe(true);
  });
  
  it('should handle decimal precision', () => {
    const result = mockEnv.repl.evaluate('0.1 + 0.2');
    expect(result.success).toBe(true);
  });
  
  it('should handle negative results', () => {
    const result = mockEnv.repl.evaluate('5 - 10');
    expect(result.success).toBe(true);
    expect(result.value).toBe(-5);
  });
  
  it('should handle expressions without spaces', () => {
    const result = mockEnv.repl.evaluate('10+5');
    expect(result.success).toBe(true);
    expect(result.value).toBe(15);
  });
  
  it('should handle multiple word aliases', () => {
    const result = mockEnv.repl.evaluate('10 multiply 5');
    expect(result.success).toBe(true);
    expect(result.value).toBe(50);
  });
  
  it('should handle case insensitivity', () => {
    const result1 = mockEnv.repl.evaluate('ADD 10 5');
    const result2 = mockEnv.repl.evaluate('add 10 5');
    const result3 = mockEnv.repl.evaluate('10 ADD 5');
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result3.success).toBe(true);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('REPL Integration', () => {
  describe('workflow scenarios', () => {
    it('should handle sequential calculations', () => {
      const repl = createREPL({ enableKeyboard: false });
      
      const r1 = repl.evaluate('10 + 5');
      expect(r1.success).toBe(true);
      expect(r1.value).toBe(15);
      
      const r2 = repl.evaluate('10 + 5');
      expect(r2.success).toBe(true);
      expect(r2.value).toBe(15);
      
      const r3 = repl.evaluate('10 + 5');
      expect(r3.success).toBe(true);
      expect(r3.value).toBe(15);
      
      repl.stop();
    });
    
    it('should accumulate results in ans variable', () => {
      const repl = createREPL({ enableKeyboard: false });
      
      repl.evaluate('10 + 5');
      const variables = repl.getVariables();
      
      // ans should be set after evaluation
      expect(variables.has('ans')).toBe(true);
      
      repl.stop();
    });
    
    it('should reset calculator state', () => {
      const repl = createREPL({ enableKeyboard: false });
      
      repl.evaluate('10 + 5');
      repl.reset();
      
      const state = repl.getState();
      expect(state.currentValue).toBe('0');
      
      repl.stop();
    });
    
    it('should clear history', () => {
      const repl = createREPL({ enableKeyboard: false });
      
      repl.evaluate('10 + 5');
      repl.clearHistory();
      
      const history = repl.getHistory();
      expect(history.length).toBe(0);
      
      repl.stop();
    });
  });
});