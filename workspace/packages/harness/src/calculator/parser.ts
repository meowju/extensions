/**
 * Expression parser using Shunting-Yard algorithm
 * Converts infix notation to RPN (Reverse Polish Notation) and evaluates
 */

import { Token, TokenType, Tokenizer } from './tokenizer';
import { BINARY_OPERATIONS, UNARY_OPERATIONS, OperationResult } from './operations';

/**
 * Parse result type
 */
export interface ParseResult {
  success: true;
  value: number;
}

export interface ParseError {
  success: false;
  error: string;
  position?: number;
}

export type EvalResult = ParseResult | ParseError;

/**
 * Expression parser class
 */
export class ExpressionParser {
  private tokens: Token[] = [];
  private pos = 0;

  /**
   * Parse and evaluate an expression string
   */
  parse(expression: string): EvalResult {
    try {
      const tokenizer = new Tokenizer(expression);
      this.tokens = tokenizer.tokenize();
      this.pos = 0;

      // Check for empty expression
      if (this.tokens.length === 0 || (this.tokens.length === 1 && this.tokens[0].type === TokenType.EOF)) {
        return { success: false, error: 'Empty expression' };
      }

      // Convert infix to RPN
      const rpn = this.toRPN();
      
      // Evaluate RPN
      const result = this.evaluateRPN(rpn);
      return result;
    } catch (e) {
      return { 
        success: false, 
        error: e instanceof Error ? e.message : 'Unknown parse error',
        position: this.pos 
      };
    }
  }

  /**
   * Convert infix tokens to Reverse Polish Notation using Shunting-Yard
   */
  private toRPN(): Token[] {
    const output: Token[] = [];
    const operatorStack: Token[] = [];
    let lastToken: Token | null = null;

    while (this.pos < this.tokens.length) {
      const token = this.nextToken();
      
      if (!token) break;

      switch (token.type) {
        case TokenType.NUMBER:
          output.push(token);
          break;

        case TokenType.PLUS:
        case TokenType.MINUS:
        case TokenType.MULTIPLY:
        case TokenType.DIVIDE:
        case TokenType.POWER:
          // Handle unary minus
          if (token.type === TokenType.MINUS && (lastToken === null || 
              lastToken.type === TokenType.PLUS || 
              lastToken.type === TokenType.MINUS ||
              lastToken.type === TokenType.MULTIPLY ||
              lastToken.type === TokenType.DIVIDE ||
              lastToken.type === TokenType.POWER ||
              lastToken.type === TokenType.LPAREN)) {
            // This is a unary minus - push a zero and treat as subtraction
            output.push({ type: TokenType.NUMBER, value: 0, position: token.position });
            operatorStack.push({ type: TokenType.MINUS, value: '-', position: token.position });
          } else {
            while (operatorStack.length > 0) {
              const top = operatorStack[operatorStack.length - 1];
              
              // Don't pop left parenthesis
              if (top.type === TokenType.LPAREN) break;
              
              // Pop if top has higher or equal precedence (left associativity)
              if (top.type !== TokenType.LPAREN && top.type !== TokenType.RPAREN) {
                const topPrec = this.getPrecedence(top.type);
                const currPrec = this.getPrecedence(token.type);
                
                if (topPrec > currPrec || (topPrec === currPrec && this.getAssociativity(token.type) === 'left')) {
                  output.push(operatorStack.pop()!);
                } else {
                  break;
                }
              } else {
                break;
              }
            }
            operatorStack.push(token);
          }
          break;

        case TokenType.LPAREN:
          operatorStack.push(token);
          break;

        case TokenType.RPAREN:
          while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type !== TokenType.LPAREN) {
            output.push(operatorStack.pop()!);
          }
          // Pop the left parenthesis
          if (operatorStack.length > 0) {
            operatorStack.pop();
          } else {
            throw new Error('Mismatched parentheses: missing (');
          }
          break;

        case TokenType.EOF:
          // Push remaining operators
          while (operatorStack.length > 0) {
            const op = operatorStack.pop()!;
            if (op.type === TokenType.LPAREN) {
              throw new Error('Mismatched parentheses: missing )');
            }
            output.push(op);
          }
          return output;

        case TokenType.FACTORIAL:
          // Factorial is a postfix operator that binds tighter than unary minus.
          // For expressions like "-5!", we want -(5!) not (-5)!
          // If there's a unary minus on the operator stack, pop it to output first
          // so it will be applied after the factorial.
          while (operatorStack.length > 0 && 
                 operatorStack[operatorStack.length - 1].type === TokenType.MINUS) {
            // Check if this MINUS is unary (has 0 on top of output)
            const outputLen = output.length;
            if (outputLen >= 1 && 
                output[outputLen - 1].type === TokenType.NUMBER &&
                output[outputLen - 1].value === 0) {
              // This is a unary minus waiting to be applied - pop it
              output.pop(); // Remove the 0
              output.push(operatorStack.pop()!); // Push the MINUS
            } else {
              break;
            }
          }
          output.push(token);
          break;
      }

      lastToken = token;
    }

    return output;
  }

  /**
   * Evaluate Reverse Polish Notation
   */
  private evaluateRPN(rpn: Token[]): EvalResult {
    const stack: number[] = [];

    for (const token of rpn) {
      switch (token.type) {
        case TokenType.NUMBER:
          stack.push(typeof token.value === 'number' ? token.value : parseFloat(token.value as string));
          break;

        case TokenType.PLUS:
        case TokenType.MINUS:
        case TokenType.MULTIPLY:
        case TokenType.DIVIDE:
        case TokenType.POWER:
          if (stack.length < 2) {
            return { success: false, error: `Invalid expression: insufficient operands for ${token.value}` };
          }
          const b = stack.pop()!;
          const a = stack.pop()!;
          const opResult = this.executeOp(token.type, a, b);
          if (!opResult.success) {
            return { success: false, error: opResult.error! };
          }
          stack.push(opResult.value!);
          break;

        case TokenType.FACTORIAL:
          if (stack.length < 1) {
            return { success: false, error: 'Invalid expression: factorial requires an operand' };
          }
          const factorialResult = this.executeUnaryOp(token.type, stack.pop()!);
          if (!factorialResult.success) {
            return { success: false, error: factorialResult.error! };
          }
          stack.push(factorialResult.value!);
          break;

        default:
          // Skip unknown tokens
          break;
      }
    }

    if (stack.length !== 1) {
      return { success: false, error: 'Invalid expression: malformed result' };
    }

    return { success: true, value: stack[0] };
  }

  /**
   * Get the next token
   */
  private nextToken(): Token | null {
    if (this.pos < this.tokens.length) {
      return this.tokens[this.pos++];
    }
    return null;
  }

  /**
   * Get precedence for operator
   */
  private getPrecedence(opType: TokenType): number {
    switch (opType) {
      case TokenType.PLUS:
      case TokenType.MINUS:
        return 1;
      case TokenType.MULTIPLY:
      case TokenType.DIVIDE:
        return 2;
      case TokenType.POWER:
        return 3;
      default:
        return 0;
    }
  }

  /**
   * Get associativity for operator
   */
  private getAssociativity(opType: TokenType): 'left' | 'right' {
    switch (opType) {
      case TokenType.POWER:
        return 'right';
      default:
        return 'left';
    }
  }

  /**
   * Execute a binary operation
   */
  private executeOp(opType: TokenType, a: number, b: number): OperationResult {
    const symbol = this.tokenTypeToSymbol(opType);
    const operation = BINARY_OPERATIONS[symbol];
    
    if (!operation) {
      return { success: false, error: `Unknown operator: ${symbol}` };
    }

    return operation.execute(a, b);
  }

  /**
   * Execute a unary operation
   */
  private executeUnaryOp(opType: TokenType, a: number): OperationResult {
    const symbol = this.tokenTypeToSymbol(opType);
    const operation = UNARY_OPERATIONS[symbol];
    
    if (!operation) {
      return { success: false, error: `Unknown unary operator: ${symbol}` };
    }

    return operation.execute(a);
  }

  /**
   * Convert token type to operator symbol
   */
  private tokenTypeToSymbol(opType: TokenType): string {
    switch (opType) {
      case TokenType.PLUS: return '+';
      case TokenType.MINUS: return '-';
      case TokenType.MULTIPLY: return '*';
      case TokenType.DIVIDE: return '/';
      case TokenType.POWER: return '^';
      case TokenType.FACTORIAL: return '!';
      default: return '';
    }
  }
}

/**
 * Parse a string expression and return the result
 */
export function evaluateExpression(expression: string): EvalResult {
  const parser = new ExpressionParser();
  return parser.parse(expression);
}

/**
 * Validate an expression without evaluating it
 */
export function validateExpression(expression: string): { valid: boolean; error?: string } {
  try {
    const tokenizer = new Tokenizer(expression);
    const tokens: Token[] = [];
    let token = tokenizer.next();

    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = tokenizer.next();
    }

    // Basic validation checks
    let parenCount = 0;
    let lastWasNumber = false;

    for (const t of tokens) {
      switch (t.type) {
        case TokenType.NUMBER:
          lastWasNumber = true;
          break;
        case TokenType.PLUS:
        case TokenType.MINUS:
        case TokenType.MULTIPLY:
        case TokenType.DIVIDE:
        case TokenType.POWER:
          if (!lastWasNumber && t.type !== TokenType.MINUS) {
            return { valid: false, error: `Operator ${t.value} at position ${t.position} requires two operands` };
          }
          lastWasNumber = false;
          break;
        case TokenType.LPAREN:
          if (lastWasNumber) {
            return { valid: false, error: `Missing operator before ( at position ${t.position}` };
          }
          parenCount++;
          lastWasNumber = false;
          break;
        case TokenType.RPAREN:
          parenCount--;
          if (parenCount < 0) {
            return { valid: false, error: `Unexpected ) at position ${t.position}` };
          }
          lastWasNumber = true;
          break;
        default:
          break;
      }
    }

    if (parenCount !== 0) {
      return { valid: false, error: 'Mismatched parentheses' };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid expression' };
  }
}