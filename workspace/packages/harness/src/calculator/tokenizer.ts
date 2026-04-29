/**
 * Token types for the calculator lexer
 */
export enum TokenType {
  NUMBER = 'NUMBER',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
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
   * Read a number (integer or decimal) from the input
   */
  private readNumber(): Token {
    const start = this.pos;
    let numStr = '';

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      if (/\d/.test(char) || char === '.') {
        numStr += char;
        this.pos++;
      } else {
        break;
      }
    }

    return { type: TokenType.NUMBER, value: parseFloat(numStr), position: start };
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