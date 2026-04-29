/**
 * Calculator Tokenizer - V3.6 Unified
 * 
 * Single source of truth for expression tokenization.
 * Fixed modulo (%) support.
 * 
 * @module tokenizer
 * @version 3.6.0
 */

/**
 * Token types for the calculator lexer
 */
export enum TokenType {
  NUMBER = 'NUMBER',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  MODULO = 'MODULO',    // [V3.6] Added modulo support
  POWER = 'POWER',
  FACTORIAL = 'FACTORIAL',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  EOF = 'EOF',
}

/**
 * Token representing a single unit of the expression
 */
export interface Token {
  type: TokenType;
  value: string | number;
  position: number;
}

/**
 * Tokenizer for mathematical expressions
 * Converts string expression into a stream of tokens
 * 
 * [V3.6] Fixed: Added MODULO support
 */
export class Tokenizer {
  private pos = 0;
  private input: string;

  constructor(input: string) {
    this.input = input.trim();
  }

  /**
   * Get the next token from the input
   */
  next(): Token {
    // Skip whitespace
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }

    if (this.pos >= this.input.length) {
      return { type: TokenType.EOF, value: '', position: this.pos };
    }

    const char = this.input[this.pos];

    // Numbers (including decimals)
    if (/\d/.test(char)) {
      return this.readNumber();
    }

    // [V3.6] Handle modulo (%) - must check before minus to avoid confusion
    if (char === '%') {
      this.pos++;
      return { type: TokenType.MODULO, value: '%', position: this.pos - 1 };
    }

    // Single character operators
    switch (char) {
      case '+':
        this.pos++;
        return { type: TokenType.PLUS, value: '+', position: this.pos - 1 };
      case '-':
        this.pos++;
        return { type: TokenType.MINUS, value: '-', position: this.pos - 1 };
      case '*':
        this.pos++;
        return { type: TokenType.MULTIPLY, value: '*', position: this.pos - 1 };
      case '/':
        this.pos++;
        return { type: TokenType.DIVIDE, value: '/', position: this.pos - 1 };
      case '^':
        this.pos++;
        return { type: TokenType.POWER, value: '^', position: this.pos - 1 };
      case '(':
        this.pos++;
        return { type: TokenType.LPAREN, value: '(', position: this.pos - 1 };
      case ')':
        this.pos++;
        return { type: TokenType.RPAREN, value: ')', position: this.pos - 1 };
      case '!':
        this.pos++;
        return { type: TokenType.FACTORIAL, value: '!', position: this.pos - 1 };
    }

    throw new Error(`Unexpected character '${char}' at position ${this.pos}`);
  }

  /**
   * Read a number (integer, decimal, or scientific notation) from the input
   * [V3.6] Added: Support for scientific notation (e.g., 1e10, 1.5e-3)
   */
  private readNumber(): Token {
    const start = this.pos;
    let numStr = '';

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      if (/\d/.test(char)) {
        numStr += char;
        this.pos++;
      } else if (char === '.') {
        // Only allow decimal point if we haven't started exponent part
        if (numStr.includes('e') || numStr.includes('E')) {
          break;
        }
        // Don't allow decimal point if already followed by exponent
        const nextChar = this.pos + 1 < this.input.length ? this.input[this.pos + 1] : '';
        if (nextChar === 'e' || nextChar === 'E') {
          break;
        }
        // Don't allow multiple decimal points in main number
        if (!numStr.includes('.')) {
          numStr += char;
          this.pos++;
        } else {
          break;
        }
      } else if ((char === 'e' || char === 'E') && numStr.length > 0) {
        // Scientific notation: check for valid exponent
        const nextChar = this.pos + 1 < this.input.length ? this.input[this.pos + 1] : '';
        // Exponent must have sign or digit after 'e' or 'E'
        if (/[+\-0-9]/.test(nextChar)) {
          numStr += char;
          this.pos++;
          // Handle optional sign
          if (nextChar === '+' || nextChar === '-') {
            numStr += nextChar;
            this.pos++;
          }
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const parsed = parseFloat(numStr);
    return { type: TokenType.NUMBER, value: parsed, position: start };
  }

  /**
   * Tokenize the entire expression into an array of tokens
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];
    let token = this.next();

    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.next();
    }

    tokens.push(token); // Add EOF token
    return tokens;
  }
}

/**
 * Get token type as string for debugging
 */
export function tokenTypeToString(type: TokenType): string {
  const names: Record<TokenType, string> = {
    [TokenType.NUMBER]: 'NUMBER',
    [TokenType.PLUS]: 'PLUS',
    [TokenType.MINUS]: 'MINUS',
    [TokenType.MULTIPLY]: 'MULTIPLY',
    [TokenType.DIVIDE]: 'DIVIDE',
    [TokenType.MODULO]: 'MODULO',
    [TokenType.POWER]: 'POWER',
    [TokenType.FACTORIAL]: 'FACTORIAL',
    [TokenType.LPAREN]: 'LPAREN',
    [TokenType.RPAREN]: 'RPAREN',
    [TokenType.EOF]: 'EOF',
  };
  return names[type];
}

export default Tokenizer;