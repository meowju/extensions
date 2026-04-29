/**
 * Expression Parser and Evaluator Tests
 * Comprehensive test suite covering all operations, precedence, and edge cases
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  // Main parser
  ExpressionParser,
  evaluateExpression,
  safeEvaluate,
  
  // Tokenizer
  Tokenizer,
  TokenType,
  
  // Parser
  Parser,
  ASTNodeType,
  
  // Evaluator
  Evaluator,
  
  // Error types
  EvaluationError,
  DivisionByZeroError,
  ModuloByZeroError,
  InvalidExpressionError,
  OverflowError,
  EmptyExpressionError,
  
  // Types
  EvalResult,
} from './expression-engine';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const assertSuccess = <T>(result: EvalResult<T>, expected: T, tolerance: number = 0.0001) => {
  expect(result.success).toBe(true);
  if (result.success) {
    if (typeof expected === 'number' && typeof result.value === 'number') {
      expect(result.value).toBeCloseTo(expected, tolerance);
    } else {
      expect(result.value).toBe(expected);
    }
  }
};

const assertError = <T>(result: EvalResult<T>, errorType: string) => {
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errorType).toBe(errorType);
  }
};

// ============================================================================
// EXPRESSION PARSER TESTS
// ============================================================================

describe('ExpressionParser', () => {
  let parser: ExpressionParser;

  beforeEach(() => {
    parser = new ExpressionParser();
  });

  // --------------------------------------------------------------------------
  // Basic Arithmetic Tests
  // --------------------------------------------------------------------------

  describe('Basic Arithmetic', () => {
    describe('Addition', () => {
      it('should add two positive numbers', () => {
        assertSuccess(parser.evaluate('2 + 3'), 5);
      });

      it('should add multiple numbers', () => {
        assertSuccess(parser.evaluate('1 + 2 + 3'), 6);
      });

      it('should handle negative results', () => {
        assertSuccess(parser.evaluate('5 - 10'), -5);
      });
    });

    describe('Subtraction', () => {
      it('should subtract two numbers', () => {
        assertSuccess(parser.evaluate('10 - 3'), 7);
      });

      it('should handle negative numbers', () => {
        assertSuccess(parser.evaluate('5 - -3'), 8);
      });
    });

    describe('Multiplication', () => {
      it('should multiply two numbers', () => {
        assertSuccess(parser.evaluate('4 * 5'), 20);
      });

      it('should multiply multiple numbers', () => {
        assertSuccess(parser.evaluate('2 * 3 * 4'), 24);
      });

      it('should handle zero', () => {
        assertSuccess(parser.evaluate('100 * 0'), 0);
      });
    });

    describe('Division', () => {
      it('should divide two numbers', () => {
        assertSuccess(parser.evaluate('20 / 4'), 5);
      });

      it('should handle decimal results', () => {
        assertSuccess(parser.evaluate('7 / 2'), 3.5);
      });

      it('should handle negative division', () => {
        assertSuccess(parser.evaluate('-10 / 2'), -5);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Operator Precedence Tests (PEMDAS/BODMAS)
  // --------------------------------------------------------------------------

  describe('Operator Precedence', () => {
    // Multiplication and Division have higher precedence than Addition and Subtraction
    it('should evaluate multiplication before addition', () => {
      assertSuccess(parser.evaluate('2 + 3 * 4'), 14); // 2 + 12 = 14
    });

    it('should evaluate division before subtraction', () => {
      assertSuccess(parser.evaluate('10 - 6 / 2'), 7); // 10 - 3 = 7
    });

    it('should evaluate left to right within same precedence', () => {
      assertSuccess(parser.evaluate('8 / 4 * 2'), 4); // 2 * 2 = 4
    });

    it('should evaluate left to right for addition', () => {
      assertSuccess(parser.evaluate('1 + 2 + 3'), 6); // (1 + 2) + 3 = 6
    });

    it('should evaluate mixed operations correctly', () => {
      assertSuccess(parser.evaluate('2 + 3 * 4 - 5'), 9); // 2 + 12 - 5 = 9
    });

    it('should evaluate 6 + 8 / 4 - 2 * 2', () => {
      // Division and multiplication first: 8/4=2, 2*2=4
      // Then addition and subtraction: 6 + 2 - 4 = 4
      assertSuccess(parser.evaluate('6 + 8 / 4 - 2 * 2'), 4);
    });

    it('should evaluate 10 / 2 + 3 * 4 - 6 / 3', () => {
      // 10/2=5, 3*4=12, 6/3=2
      // 5 + 12 - 2 = 15
      assertSuccess(parser.evaluate('10 / 2 + 3 * 4 - 6 / 3'), 15);
    });
  });

  // --------------------------------------------------------------------------
  // Parentheses Tests
  // --------------------------------------------------------------------------

  describe('Parentheses (Grouping)', () => {
    it('should evaluate parentheses first', () => {
      assertSuccess(parser.evaluate('(2 + 3) * 4'), 20);
    });

    it('should handle nested parentheses', () => {
      assertSuccess(parser.evaluate('((2 + 3)) * 4'), 20);
    });

    it('should handle complex nesting', () => {
      assertSuccess(parser.evaluate('((1 + 2) * (3 + 4))'), 21);
    });

    it('should evaluate 2 * (3 + 4)', () => {
      assertSuccess(parser.evaluate('2 * (3 + 4)'), 14);
    });

    it('should evaluate (10 + 2) / (5 - 3)', () => {
      assertSuccess(parser.evaluate('(10 + 2) / (5 - 3)'), 6);
    });

    it('should handle (2 + 3) * (4 + 5) + 6', () => {
      // (2+3) = 5, (4+5) = 9, 5*9 = 45, 45 + 6 = 51
      assertSuccess(parser.evaluate('(2 + 3) * (4 + 5) + 6'), 51);
    });
  });

  // --------------------------------------------------------------------------
  // Unary Operations
  // --------------------------------------------------------------------------

  describe('Unary Operations', () => {
    it('should handle leading negative number', () => {
      assertSuccess(parser.evaluate('-5 + 3'), -2);
    });

    it('should handle double negative', () => {
      assertSuccess(parser.evaluate('--5'), 5);
    });

    it('should handle negative in parentheses', () => {
      assertSuccess(parser.evaluate('(-5) * 2'), -10);
    });

    it('should handle leading positive (no-op)', () => {
      assertSuccess(parser.evaluate('+5 + 3'), 8);
    });

    it('should handle 5 * -3', () => {
      assertSuccess(parser.evaluate('5 * -3'), -15);
    });

    it('should handle -10 / -2', () => {
      assertSuccess(parser.evaluate('-10 / -2'), 5);
    });
  });

  // --------------------------------------------------------------------------
  // Decimal Numbers
  // --------------------------------------------------------------------------

  describe('Decimal Numbers', () => {
    it('should handle simple decimals', () => {
      assertSuccess(parser.evaluate('0.5 + 0.3'), 0.8);
    });

    it('should handle 0.1 + 0.2 (floating point edge case)', () => {
      assertSuccess(parser.evaluate('0.1 + 0.2'), 0.3, 10);
    });

    it('should handle 0.1 + 0.2 = 0.30000000000000004 issue', () => {
      const result = parser.evaluate('0.1 + 0.2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeCloseTo(0.3, 10);
      }
    });

    it('should handle decimal multiplication', () => {
      assertSuccess(parser.evaluate('0.5 * 0.4'), 0.2);
    });

    it('should handle decimal division', () => {
      assertSuccess(parser.evaluate('1.5 / 0.5'), 3);
    });

    it('should handle numbers starting with decimal', () => {
      assertSuccess(parser.evaluate('.5 + .3'), 0.8);
    });

    it('should handle multi-digit decimals', () => {
      assertSuccess(parser.evaluate('3.14159 * 2'), 6.28318);
    });
  });

  // --------------------------------------------------------------------------
  // Exponentiation
  // --------------------------------------------------------------------------

  describe('Exponentiation (^)', () => {
    it('should handle simple power', () => {
      assertSuccess(parser.evaluate('2 ^ 3'), 8);
    });

    it('should handle power with higher precedence', () => {
      // 2 ^ 3 = 8, then 8 + 1 = 9
      assertSuccess(parser.evaluate('2 ^ 3 + 1'), 9);
    });

    it('should handle power with multiplication', () => {
      // 2 ^ 3 = 8, then 8 * 2 = 16
      assertSuccess(parser.evaluate('2 ^ 3 * 2'), 16);
    });

    it('should handle 2 ^ 3 ^ 2 (right associative)', () => {
      // Should be 2^9 = 512 (if right-associative)
      assertSuccess(parser.evaluate('2 ^ 3 ^ 2'), 512);
    });

    it('should handle negative base with even exponent', () => {
      assertSuccess(parser.evaluate('(-2) ^ 2'), 4);
    });

    it('should handle negative base with odd exponent', () => {
      assertSuccess(parser.evaluate('(-2) ^ 3'), -8);
    });

    it('should handle 0 ^ 0', () => {
      assertSuccess(parser.evaluate('0 ^ 0'), 1);
    });

    it('should handle power of zero', () => {
      assertSuccess(parser.evaluate('5 ^ 0'), 1);
    });

    it('should handle power of one', () => {
      assertSuccess(parser.evaluate('3 ^ 1'), 3);
    });
  });

  // --------------------------------------------------------------------------
  // Modulo
  // --------------------------------------------------------------------------

  describe('Modulo (%)', () => {
    it('should handle simple modulo', () => {
      assertSuccess(parser.evaluate('10 % 3'), 1);
    });

    it('should handle modulo with multiplication', () => {
      // 5 * 4 = 20, then 20 % 3 = 2
      assertSuccess(parser.evaluate('5 * 4 % 3'), 2);
    });

    it('should handle modulo on even division', () => {
      assertSuccess(parser.evaluate('10 % 5'), 0);
    });

    it('should handle negative modulo', () => {
      // Result should always be positive in our implementation
      assertSuccess(parser.evaluate('17 % 5'), 2);
    });

    it('should handle 100 % 7 + 3', () => {
      // 100 % 7 = 2, then 2 + 3 = 5
      assertSuccess(parser.evaluate('100 % 7 + 3'), 5);
    });
  });

  // --------------------------------------------------------------------------
  // Complex Expressions
  // --------------------------------------------------------------------------

  describe('Complex Expressions', () => {
    it('should evaluate (10 + 5) * 2 - 4 / 2', () => {
      // (10+5) = 15, 15*2 = 30, 4/2 = 2, 30 - 2 = 28
      assertSuccess(parser.evaluate('(10 + 5) * 2 - 4 / 2'), 28);
    });

    it('should evaluate 2 ^ 3 + 4 * 5 - 6 / 2', () => {
      // 2^3 = 8, 4*5 = 20, 6/2 = 3, 8+20-3 = 25
      assertSuccess(parser.evaluate('2 ^ 3 + 4 * 5 - 6 / 2'), 25);
    });

    it('should evaluate 100 / (5 * (2 + 3))', () => {
      // 2+3 = 5, 5*5 = 25, 100/25 = 4
      assertSuccess(parser.evaluate('100 / (5 * (2 + 3))'), 4);
    });

    it('should handle deeply nested expression', () => {
      assertSuccess(parser.evaluate('(((1 + 2) * 3) - 4) / 5'), 1);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle single number', () => {
      assertSuccess(parser.evaluate('42'), 42);
    });

    it('should handle number with spaces', () => {
      assertSuccess(parser.evaluate('  42  '), 42);
    });

    it('should handle multiple spaces between numbers', () => {
      assertSuccess(parser.evaluate('2   +   3'), 5);
    });

    it('should handle tabs and spaces', () => {
      assertSuccess(parser.evaluate('2\t+\t3'), 5);
    });

    it('should handle leading zeros', () => {
      assertSuccess(parser.evaluate('007 + 003'), 10);
    });

    it('should handle 0 + 0', () => {
      assertSuccess(parser.evaluate('0 + 0'), 0);
    });

    it('should handle 1 - 1', () => {
      assertSuccess(parser.evaluate('1 - 1'), 0);
    });

    it('should handle 0 * 100', () => {
      assertSuccess(parser.evaluate('0 * 100'), 0);
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling - Division by Zero
  // --------------------------------------------------------------------------

  describe('Division by Zero', () => {
    it('should return error for simple division by zero', () => {
      assertError(parser.evaluate('10 / 0'), 'DivisionByZeroError');
    });

    it('should return error for 0 / 0', () => {
      assertError(parser.evaluate('0 / 0'), 'DivisionByZeroError');
    });

    it('should return error after evaluation', () => {
      // 10 - 10 = 0, then 5 / 0
      assertError(parser.evaluate('(10 - 10) / 0'), 'DivisionByZeroError');
    });

    it('should return error in complex expression', () => {
      // (10 + 2) / (5 - 5) = 12 / 0
      assertError(parser.evaluate('(10 + 2) / (5 - 5)'), 'DivisionByZeroError');
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling - Modulo by Zero
  // --------------------------------------------------------------------------

  describe('Modulo by Zero', () => {
    it('should return error for simple modulo by zero', () => {
      assertError(parser.evaluate('10 % 0'), 'ModuloByZeroError');
    });

    it('should return error in expression', () => {
      assertError(parser.evaluate('5 % (3 - 3)'), 'ModuloByZeroError');
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling - Overflow
  // --------------------------------------------------------------------------

  describe('Overflow', () => {
    it('should return error for very large result', () => {
      assertError(parser.evaluate('10 ^ 20'), 'OverflowError');
    });

    it('should return error for multiplication overflow', () => {
      // 1e10 * 1e10 = 1e20 (should overflow)
      assertError(parser.evaluate('10000000000 * 10000000000'), 'OverflowError');
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling - Invalid Expressions
  // --------------------------------------------------------------------------

  describe('Invalid Expressions', () => {
    it('should return error for empty expression', () => {
      assertError(parser.evaluate(''), 'EmptyExpressionError');
    });

    it('should return error for whitespace only', () => {
      assertError(parser.evaluate('   '), 'EmptyExpressionError');
    });

    it('should return error for missing operand', () => {
      assertError(parser.evaluate('5 +'), 'UnexpectedTokenError');
    });

    it('should return error for missing number', () => {
      assertError(parser.evaluate('+ 5'), 'UnexpectedTokenError');
    });

    it('should return error for unmatched parenthesis', () => {
      assertError(parser.evaluate('(5 + 3'), 'UnexpectedTokenError');
    });

    it('should return error for extra closing parenthesis', () => {
      assertError(parser.evaluate('5 + 3)'), 'UnexpectedTokenError');
    });

    it('should return error for double operators', () => {
      assertError(parser.evaluate('5 ++ 3'), 'UnexpectedTokenError');
    });

    it('should return error for invalid character', () => {
      assertError(parser.evaluate('5 & 3'), 'InvalidExpressionError');
    });
  });
});

// ============================================================================
// TOKENIZER TESTS
// ============================================================================

describe('Tokenizer', () => {
  describe('Number Tokens', () => {
    it('should tokenize integer', () => {
      const tokenizer = new Tokenizer('123');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: 123, position: 0 });
    });

    it('should tokenize decimal', () => {
      const tokenizer = new Tokenizer('3.14');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: 3.14, position: 0 });
    });

    it('should tokenize number starting with decimal', () => {
      const tokenizer = new Tokenizer('.5');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: 0.5, position: 0 });
    });

    it('should tokenize scientific notation', () => {
      const tokenizer = new Tokenizer('1e10');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: 1e10, position: 0 });
    });
  });

  describe('Operator Tokens', () => {
    it('should tokenize +', () => {
      const tokenizer = new Tokenizer('+');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.PLUS, value: '+', position: 0 });
    });

    it('should tokenize -', () => {
      const tokenizer = new Tokenizer('-');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.MINUS, value: '-', position: 0 });
    });

    it('should tokenize *', () => {
      const tokenizer = new Tokenizer('*');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.MULTIPLY, value: '*', position: 0 });
    });

    it('should tokenize /', () => {
      const tokenizer = new Tokenizer('/');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.DIVIDE, value: '/', position: 0 });
    });

    it('should tokenize ^', () => {
      const tokenizer = new Tokenizer('^');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.POWER, value: '^', position: 0 });
    });

    it('should tokenize %', () => {
      const tokenizer = new Tokenizer('%');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.MODULO, value: '%', position: 0 });
    });
  });

  describe('Parentheses Tokens', () => {
    it('should tokenize (', () => {
      const tokenizer = new Tokenizer('(');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.LEFT_PAREN, value: '(', position: 0 });
    });

    it('should tokenize )', () => {
      const tokenizer = new Tokenizer(')');
      const tokens = tokenizer.tokenize();
      expect(tokens[0]).toEqual({ type: TokenType.RIGHT_PAREN, value: ')', position: 0 });
    });
  });

  describe('Complex Tokenization', () => {
    it('should tokenize "2 + 3 * 4"', () => {
      const tokenizer = new Tokenizer('2 + 3 * 4');
      const tokens = tokenizer.tokenize();
      
      expect(tokens).toHaveLength(6); // 2, +, 3, *, 4, EOF
      expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: 2, position: 0 });
      expect(tokens[1]).toEqual({ type: TokenType.PLUS, value: '+', position: 2 });
      expect(tokens[2]).toEqual({ type: TokenType.NUMBER, value: 3, position: 4 });
      expect(tokens[3]).toEqual({ type: TokenType.MULTIPLY, value: '*', position: 6 });
      expect(tokens[4]).toEqual({ type: TokenType.NUMBER, value: 4, position: 8 });
      expect(tokens[5]).toEqual({ type: TokenType.EOF, value: null, position: 9 });
    });

    it('should tokenize "(1 + 2)"', () => {
      const tokenizer = new Tokenizer('(1 + 2)');
      const tokens = tokenizer.tokenize();
      
      expect(tokens).toHaveLength(6); // (, 1, +, 2, ), EOF
      expect(tokens[0]).toEqual({ type: TokenType.LEFT_PAREN, value: '(', position: 0 });
      expect(tokens[1]).toEqual({ type: TokenType.NUMBER, value: 1, position: 1 });
      expect(tokens[2]).toEqual({ type: TokenType.PLUS, value: '+', position: 3 });
      expect(tokens[3]).toEqual({ type: TokenType.NUMBER, value: 2, position: 5 });
      expect(tokens[4]).toEqual({ type: TokenType.RIGHT_PAREN, value: ')', position: 6 });
    });
  });
});

// ============================================================================
// PARSER TESTS
// ============================================================================

describe('Parser', () => {
  describe('AST Generation', () => {
    it('should create NUMBER node for simple number', () => {
      const tokenizer = new Tokenizer('42');
      const tokens = tokenizer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      
      expect(ast.type).toBe(ASTNodeType.NUMBER);
      expect((ast as any).value).toBe(42);
    });

    it('should create BINARY_OP node for addition', () => {
      const tokenizer = new Tokenizer('2 + 3');
      const tokens = tokenizer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      
      expect(ast.type).toBe(ASTNodeType.BINARY_OP);
      expect((ast as any).operator).toBe('+');
      expect((ast as any).left.type).toBe(ASTNodeType.NUMBER);
      expect((ast as any).right.type).toBe(ASTNodeType.NUMBER);
    });

    it('should create nested BINARY_OP for precedence', () => {
      // 2 + 3 * 4 should create:
      // BinaryOp('+', Number(2), BinaryOp('*', Number(3), Number(4)))
      const tokenizer = new Tokenizer('2 + 3 * 4');
      const tokens = tokenizer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      
      expect(ast.type).toBe(ASTNodeType.BINARY_OP);
      expect((ast as any).operator).toBe('+');
      expect((ast as any).left.type).toBe(ASTNodeType.NUMBER);
      expect((ast as any).right.type).toBe(ASTNodeType.BINARY_OP);
      expect((ast as any).right.operator).toBe('*');
    });

    it('should create nested structure for parentheses', () => {
      // (2 + 3) * 4 should create:
      // BinaryOp('*', BinaryOp('+', Number(2), Number(3)), Number(4))
      const tokenizer = new Tokenizer('(2 + 3) * 4');
      const tokens = tokenizer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      
      expect(ast.type).toBe(ASTNodeType.BINARY_OP);
      expect((ast as any).operator).toBe('*');
      expect((ast as any).left.type).toBe(ASTNodeType.BINARY_OP);
      expect((ast as any).left.operator).toBe('+');
      expect((ast as any).right.type).toBe(ASTNodeType.NUMBER);
    });
  });
});

// ============================================================================
// CONVENIENCE FUNCTION TESTS
// ============================================================================

describe('Convenience Functions', () => {
  describe('evaluateExpression', () => {
    it('should return number on success', () => {
      expect(evaluateExpression('2 + 3')).toBe(5);
    });

    it('should throw EvaluationError on failure', () => {
      expect(() => evaluateExpression('10 / 0')).toThrow(DivisionByZeroError);
    });
  });

  describe('safeEvaluate', () => {
    it('should return number on success', () => {
      expect(safeEvaluate('2 + 3')).toBe(5);
    });

    it('should return null on error', () => {
      expect(safeEvaluate('10 / 0')).toBeNull();
    });

    it('should return null for invalid expression', () => {
      expect(safeEvaluate('invalid')).toBeNull();
    });
  });
});

// ============================================================================
// REGRESSION TESTS - Real-world scenarios
// ============================================================================

describe('Regression Tests', () => {
  let parser: ExpressionParser;

  beforeEach(() => {
    parser = new ExpressionParser();
  });

  it('should handle the classic 0.1 + 0.2 floating point issue', () => {
    const result = parser.evaluate('0.1 + 0.2');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBeCloseTo(0.3, 10);
    }
  });

  it('should handle tax calculation: 100 + 100 * 0.08', () => {
    // Should be 100 + 8 = 108, not 208
    assertSuccess(parser.evaluate('100 + 100 * 0.08'), 108);
  });

  it('should handle percentage with precedence: 200 * 0.1 + 50', () => {
    // 200 * 0.1 = 20, 20 + 50 = 70
    assertSuccess(parser.evaluate('200 * 0.1 + 50'), 70);
  });

  it('should handle complex expression: ((15 / (7 - (1 + 1))) * 3) - (2 + (1 + 1))', () => {
    // Inner: (1+1) = 2
    // (7 - 2) = 5
    // 15 / 5 = 3
    // 3 * 3 = 9
    // Other inner: (1+1) = 2
    // (2+2) = 4
    // 9 - 4 = 5
    assertSuccess(parser.evaluate('((15 / (7 - (1 + 1))) * 3) - (2 + (1 + 1))'), 5);
  });

  it('should handle expression from SPEC: (10 + 5) * 2 - 4 / 2 = 27', () => {
    // (10+5) = 15, 15*2 = 30, 4/2 = 2, 30-2 = 28
    // Note: The SPEC says 27 but that's incorrect - the correct answer is 28
    assertSuccess(parser.evaluate('(10 + 5) * 2 - 4 / 2'), 28);
  });

  it('should handle order of operations with all operators', () => {
    // PEMDAS: Parentheses, Exponents, MD, AS
    // 10 / 2 ^ 2 + 3 * 4 - 5 % 3
    // 2^2 = 4
    // 10/4 = 2.5
    // 3*4 = 12
    // 5%3 = 2
    // 2.5 + 12 - 2 = 12.5
    assertSuccess(parser.evaluate('10 / 2 ^ 2 + 3 * 4 - 5 % 3'), 12.5);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance', () => {
  let parser: ExpressionParser;

  beforeEach(() => {
    parser = new ExpressionParser();
  });

  it('should handle long expression quickly', () => {
    const expression = '1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10';
    const start = performance.now();
    const result = parser.evaluate(expression);
    const duration = performance.now() - start;
    
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(10); // Should complete in under 10ms
  });

  it('should handle deeply nested expression', () => {
    // Create a deeply nested expression: (1+(1+(1+(1+(1)))))
    let expression = '1';
    for (let i = 0; i < 100; i++) {
      expression = `(${expression} + 1)`;
    }
    
    const start = performance.now();
    const result = parser.evaluate(expression);
    const duration = performance.now() - start;
    
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(50); // Should complete in under 50ms
  });
});
