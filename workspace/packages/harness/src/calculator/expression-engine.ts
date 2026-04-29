/**
 * Expression Parser and Evaluator
 * 
 * A robust calculation engine that handles:
 * - Operator precedence (PEMDAS/BODMAS)
 * - Decimal numbers
 * - Edge cases (division by zero, overflow)
 * - Parentheses for grouping
 * 
 * Architecture: Tokenizer → Parser → AST → Evaluator
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Token types for the expression lexer */
export enum TokenType {
  NUMBER = 'NUMBER',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  MODULO = 'MODULO',
  POWER = 'POWER',
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  EOF = 'EOF',
}

/** Token representing a single unit of the expression */
export interface Token {
  type: TokenType;
  value: string | number;
  position: number;
}

/** AST node types */
export enum ASTNodeType {
  NUMBER = 'NUMBER',
  BINARY_OP = 'BINARY_OP',
  UNARY_OP = 'UNARY_OP',
}

/** Binary operation operators */
export type BinaryOperator = '+' | '-' | '*' | '/' | '%' | '^';

/** Unary operation operators */
export type UnaryOperator = '+' | '-';

/** AST Node interface */
export interface ASTNode {
  type: ASTNodeType;
}

/** Number literal node */
export interface NumberNode extends ASTNode {
  type: ASTNodeType.NUMBER;
  value: number;
}

/** Binary operation node */
export interface BinaryOpNode extends ASTNode {
  type: ASTNodeType.BINARY_OP;
  operator: BinaryOperator;
  left: ASTNode;
  right: ASTNode;
}

/** Unary operation node */
export interface UnaryOpNode extends ASTNode {
  type: ASTNodeType.UNARY_OP;
  operator: UnaryOperator;
  operand: ASTNode;
}

export type AnyASTNode = NumberNode | BinaryOpNode | UnaryOpNode;

/** Result type for all operations that can fail */
export type EvalResult<T> =
  | { success: true; value: T }
  | { success: false; error: EvaluationError };

/** Custom error class for calculator-specific errors */
export class EvaluationError extends Error {
  public readonly errorType: string;
  public readonly position?: number;

  constructor(
    message: string,
    errorType: string = 'EvaluationError',
    position?: number
  ) {
    super(message);
    this.name = 'EvaluationError';
    this.errorType = errorType;
    this.position = position;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class DivisionByZeroError extends EvaluationError {
  constructor(position?: number) {
    super('Division by zero is not allowed', 'DivisionByZeroError', position);
  }
}

export class ModuloByZeroError extends EvaluationError {
  constructor(position?: number) {
    super('Modulo by zero is not allowed', 'ModuloByZeroError', position);
  }
}

export class InvalidExpressionError extends EvaluationError {
  constructor(message: string, position?: number) {
    super(message, 'InvalidExpressionError', position);
  }
}

export class UnexpectedTokenError extends EvaluationError {
  constructor(expected: string, received: string, position: number) {
    super(
      `Expected ${expected}, but received '${received}'`,
      'UnexpectedTokenError',
      position
    );
  }
}

export class OverflowError extends EvaluationError {
  constructor() {
    super(
      'Result exceeds maximum allowed value',
      'OverflowError'
    );
  }
}

export class EmptyExpressionError extends EvaluationError {
  constructor() {
    super('Expression cannot be empty', 'EmptyExpressionError');
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_VALUE = 1e15;
const MIN_VALUE = -1e15;
const PRECISION = 15; // JavaScript floating point precision

/** Operator precedence (higher = binds tighter) */
const OPERATOR_PRECEDENCE: Record<BinaryOperator | UnaryOperator, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 2,
  '^': 3, // Exponentiation binds tighter than multiply/divide
};

/** Operators that are left-associative */
const LEFT_ASSOCIATIVE: Set<BinaryOperator> = new Set(['+', '-', '*', '/', '%']);

// ============================================================================
// TOKENIZER (LEXER)
// ============================================================================

/**
 * Tokenizer class that converts an expression string into a stream of tokens.
 * Handles decimal numbers, multi-digit numbers, and all operators.
 */
export class Tokenizer {
  private input: string;
  private position: number;
  private currentChar: string | null;

  constructor(expression: string) {
    this.input = expression.trim();
    this.position = 0;
    this.currentChar = this.input.length > 0 ? this.input[0] : null;
  }

  /**
   * Advances the position pointer by one character
   */
  private advance(): void {
    this.position++;
    this.currentChar = this.position < this.input.length
      ? this.input[this.position]
      : null;
  }

  /**
   * Peeks at the next character without advancing
   */
  private peek(): string | null {
    const nextPos = this.position + 1;
    return nextPos < this.input.length ? this.input[nextPos] : null;
  }

  /**
   * Checks if current character is a digit (0-9)
   */
  private isDigit(char: string | null): boolean {
    return char !== null && /[0-9]/.test(char);
  }

  /**
   * Checks if current character is a decimal point
   */
  private isDecimalPoint(char: string | null): boolean {
    return char === '.';
  }

  /**
   * Checks if current character is whitespace
   */
  private isWhitespace(char: string | null): boolean {
    return char !== null && /\s/.test(char);
  }

  /**
   * Reads a number from the input (integer or decimal)
   */
  private readNumber(): Token {
    const startPos = this.position;
    let result = '';
    
    // Read integer part
    while (this.currentChar !== null && this.isDigit(this.currentChar)) {
      result += this.currentChar;
      this.advance();
    }
    
    // Read decimal part
    if (this.currentChar === '.') {
      result += '.';
      this.advance();
      
      while (this.currentChar !== null && this.isDigit(this.currentChar)) {
        result += this.currentChar;
        this.advance();
      }
    }
    
    // Handle scientific notation (e.g., 1e10, 2.5e-3)
    if (this.currentChar === 'e' || this.currentChar === 'E') {
      result += this.currentChar;
      this.advance();
      
      // Handle sign after 'e' or 'E'
      if (this.currentChar === '+' || this.currentChar === '-') {
        result += this.currentChar;
        this.advance();
      }
      
      // Read exponent digits
      while (this.currentChar !== null && this.isDigit(this.currentChar)) {
        result += this.currentChar;
        this.advance();
      }
    }
    
    const value = parseFloat(result);
    
    // Validate the parsed number
    if (!Number.isFinite(value)) {
      throw new InvalidExpressionError(
        `Invalid number format: ${result}`,
        startPos
      );
    }
    
    return {
      type: TokenType.NUMBER,
      value,
      position: startPos,
    };
  }

  /**
   * Reads an operator from the input
   */
  private readOperator(): Token {
    const startPos = this.position;
    const char = this.currentChar!;
    
    // Map characters to token types
    const operatorMap: Record<string, TokenType> = {
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.MULTIPLY,
      '/': TokenType.DIVIDE,
      '%': TokenType.MODULO,
      '^': TokenType.POWER,
      '(': TokenType.LEFT_PAREN,
      ')': TokenType.RIGHT_PAREN,
    };
    
    this.advance();
    return {
      type: operatorMap[char],
      value: char,
      position: startPos,
    };
  }

  /**
   * Skips whitespace in the input
   */
  private skipWhitespace(): void {
    while (this.currentChar !== null && this.isWhitespace(this.currentChar)) {
      this.advance();
    }
  }

  /**
   * Gets the next token from the input
   */
  public getNextToken(): Token {
    // Skip whitespace
    while (this.currentChar !== null && this.isWhitespace(this.currentChar)) {
      this.advance();
    }
    
    // End of input
    if (this.currentChar === null) {
      return { type: TokenType.EOF, value: null, position: this.position };
    }
    
    // Numbers (including decimals)
    if (this.isDigit(this.currentChar)) {
      return this.readNumber();
    }
    
    // Handle implicit multiplication: 2(3) or (3)2 or )( 
    if (this.isDecimalPoint(this.currentChar)) {
      return this.readNumber(); // Handles cases like .5
    }
    
    // Operators and parentheses
    const operatorMap: Record<string, TokenType> = {
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.MULTIPLY,
      '/': TokenType.DIVIDE,
      '%': TokenType.MODULO,
      '^': TokenType.POWER,
      '(': TokenType.LEFT_PAREN,
      ')': TokenType.RIGHT_PAREN,
    };
    
    if (operatorMap[this.currentChar]) {
      return this.readOperator();
    }
    
    throw new InvalidExpressionError(
      `Unexpected character: '${this.currentChar}'`,
      this.position
    );
  }

  /**
   * Tokenizes the entire expression into an array of tokens
   */
  public tokenize(): Token[] {
    const tokens: Token[] = [];
    let token = this.getNextToken();
    
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.getNextToken();
    }
    
    // Add EOF token
    tokens.push(token);
    
    return tokens;
  }
}

// ============================================================================
// PARSER (RECURSIVE DESCENT)
// ============================================================================

/**
 * Recursive descent parser that builds an Abstract Syntax Tree (AST)
 * with proper operator precedence.
 * 
 * Grammar (from lowest to highest precedence):
 *   expression     → term (('+' | '-') term)*
 *   term           → power (('*' | '/' | '%') power)*
 *   power          → unary ('^' unary)*
 *   unary          → ('+' | '-') unary | primary
 *   primary        → NUMBER | '(' expression ')'
 */
export class Parser {
  private tokens: Token[];
  private position: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.position = 0;
  }

  /**
   * Gets the current token without advancing
   */
  private current(): Token {
    return this.tokens[this.position];
  }

  /**
   * Gets the previous token
   */
  private previous(): Token {
    return this.tokens[this.position - 1];
  }

  /**
   * Checks if the current token matches the given type and advances if so
   */
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if the current token is of the given type
   */
  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  /**
   * Advances to the next token
   */
  private advance(): Token {
    if (!this.isAtEnd()) {
      this.position++;
    }
    return this.previous();
  }

  /**
   * Checks if we've reached the end of tokens
   */
  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }

  /**
   * Consumes a token of the expected type, throwing if not found
   */
  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw new UnexpectedTokenError(
      message,
      this.current().value as string,
      this.current().position
    );
  }

  /**
   * Parses the entire expression
   * expression → term (('+' | '-') term)*
   */
  public parseExpression(): ASTNode {
    const node = this.parseTerm();
    
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value as '+' | '-';
      const right = this.parseTerm();
      return this.createBinaryOp(operator, node, right);
    }
    
    return node;
  }

  /**
   * Parses terms (handle *, /, %)
   * term → power (('*' | '/' | '%') power)*
   */
  private parseTerm(): ASTNode {
    let left = this.parsePower();
    
    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
      const operator = this.previous().value as '*' | '/' | '%';
      const right = this.parsePower();
      left = this.createBinaryOp(operator, left, right);
    }
    
    return left;
  }

  /**
   * Parses power operations (handle ^)
   * power → unary ('^' unary)*
   */
  private parsePower(): ASTNode {
    let left = this.parseUnary();
    
    while (this.match(TokenType.POWER)) {
      const right = this.parseUnary();
      left = this.createBinaryOp('^', left, right);
    }
    
    return left;
  }

  /**
   * Parses unary operations (handle + and -)
   * unary → ('+' | '-') unary | primary
   */
  private parseUnary(): ASTNode {
    if (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value as '+' | '-';
      const operand = this.parseUnary();
      return this.createUnaryOp(operator, operand);
    }
    
    return this.parsePrimary();
  }

  /**
   * Parses primary expressions (numbers and grouped expressions)
   * primary → NUMBER | '(' expression ')'
   */
  private parsePrimary(): ASTNode {
    // Handle number
    if (this.match(TokenType.NUMBER)) {
      return {
        type: ASTNodeType.NUMBER,
        value: this.previous().value as number,
      };
    }
    
    // Handle grouped expression with parentheses
    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.parseExpression();
      this.consume(
        TokenType.RIGHT_PAREN,
        `Expected ')' after expression, but got '${this.current().value}'`
      );
      return expr;
    }
    
    // Handle implicit multiplication after closing paren
    // e.g., (2)(3) should be 2 * 3
    if (this.match(TokenType.RIGHT_PAREN)) {
      // We backed up one - we'll handle this differently
      // Actually, let's just error here as it's ambiguous
      throw new InvalidExpressionError(
        `Unexpected token: '${this.current().value}'`,
        this.current().position
      );
    }
    
    throw new InvalidExpressionError(
      `Expected a number or '(', but got '${this.current().value}'`,
      this.current().position
    );
  }

  /**
   * Creates a binary operation AST node
   */
  private createBinaryOp(operator: BinaryOperator, left: ASTNode, right: ASTNode): BinaryOpNode {
    return {
      type: ASTNodeType.BINARY_OP,
      operator,
      left,
      right,
    };
  }

  /**
   * Creates a unary operation AST node
   */
  private createUnaryOp(operator: UnaryOperator, operand: ASTNode): UnaryOpNode {
    return {
      type: ASTNodeType.UNARY_OP,
      operator,
      operand,
    };
  }

  /**
   * Parses the entire token stream into an AST
   */
  public parse(): ASTNode {
    const ast = this.parseExpression();
    
    if (!this.isAtEnd()) {
      throw new InvalidExpressionError(
        `Unexpected token after expression: '${this.current().value}'`,
        this.current().position
      );
    }
    
    return ast;
  }
}

// ============================================================================
// AST VISITOR / EVALUATOR
// ============================================================================

/**
 * Evaluates an AST node and returns the result
 */
export class Evaluator {
  /**
   * Evaluates a number node
   */
  private evaluateNumber(node: NumberNode): number {
    return node.value;
  }

  /**
   * Evaluates a binary operation node
   */
  private evaluateBinaryOp(node: BinaryOpNode): EvalResult<number> {
    // Evaluate left and right operands
    const leftResult = this.evaluate(node.left);
    if (!leftResult.success) {
      return leftResult;
    }

    const rightResult = this.evaluate(node.right);
    if (!rightResult.success) {
      return rightResult;
    }

    const left = leftResult.value;
    const right = rightResult.value;

    // Perform the operation
    switch (node.operator) {
      case '+':
        return this.safeAdd(left, right);
      case '-':
        return this.safeSubtract(left, right);
      case '*':
        return this.safeMultiply(left, right);
      case '/':
        return this.safeDivide(left, right);
      case '%':
        return this.safeModulo(left, right);
      case '^':
        return this.safePower(left, right);
      default:
        return {
          success: false,
          error: new InvalidExpressionError(`Unknown operator: ${node.operator}`)
        };
    }
  }

  /**
   * Evaluates a unary operation node
   */
  private evaluateUnaryOp(node: UnaryOpNode): EvalResult<number> {
    const operandResult = this.evaluate(node.operand);
    if (!operandResult.success) {
      return operandResult;
    }

    switch (node.operator) {
      case '+':
        return { success: true, value: operandResult.value };
      case '-':
        return { success: true, value: -operandResult.value };
      default:
        return {
          success: false,
          error: new InvalidExpressionError(`Unknown unary operator: ${node.operator}`)
        };
    }
  }

  /**
   * Main evaluation dispatcher
   */
  public evaluate(node: ASTNode): EvalResult<number> {
    switch (node.type) {
      case ASTNodeType.NUMBER:
        return this.evaluateNumber(node as NumberNode);
      case ASTNodeType.BINARY_OP:
        return this.evaluateBinaryOp(node as BinaryOpNode);
      case ASTNodeType.UNARY_OP:
        return this.evaluateUnaryOp(node as UnaryOpNode);
      default:
        return {
          success: false,
          error: new InvalidExpressionError(`Unknown AST node type`)
        };
    }
  }

  // Safe arithmetic operations with overflow checking

  private safeAdd(a: number, b: number): EvalResult<number> {
    const result = a + b;
    return this.checkOverflow(result);
  }

  private safeSubtract(a: number, b: number): EvalResult<number> {
    const result = a - b;
    return this.checkOverflow(result);
  }

  private safeMultiply(a: number, b: number): EvalResult<number> {
    // Check for zero first (optimization)
    if (a === 0 || b === 0) {
      return { success: true, value: 0 };
    }
    
    const result = a * b;
    return this.checkOverflow(result);
  }

  private safeDivide(a: number, b: number): EvalResult<number> {
    if (b === 0) {
      return { success: false, error: new DivisionByZeroError() };
    }
    
    const result = a / b;
    return this.checkOverflow(result);
  }

  private safeModulo(a: number, b: number): EvalResult<number> {
    if (b === 0) {
      return { success: false, error: new ModuloByZeroError() };
    }
    
    // JavaScript's % can produce negative remainders
    // For calculator purposes, we want always-positive remainders
    const result = ((a % b) + b) % b;
    return this.checkOverflow(result);
  }

  private safePower(base: number, exponent: number): EvalResult<number> {
    // Handle special cases
    if (exponent === 0) {
      return { success: true, value: 1 };
    }
    if (exponent === 1) {
      return this.checkOverflow(base);
    }
    if (base === 0) {
      return { success: true, value: 0 };
    }
    if (base === 1) {
      return { success: true, value: 1 };
    }
    
    // Check for negative exponent (would produce fractional result)
    if (exponent < 0 && !Number.isInteger(exponent)) {
      return {
        success: false,
        error: new InvalidExpressionError(
          'Fractional powers of negative numbers are not supported'
        )
      };
    }
    
    const result = Math.pow(base, exponent);
    return this.checkOverflow(result);
  }

  /**
   * Checks if a result has overflowed and returns appropriate error or value
   */
  private checkOverflow(value: number): EvalResult<number> {
    if (!Number.isFinite(value)) {
      return { success: false, error: new OverflowError() };
    }
    
    if (Math.abs(value) > MAX_VALUE) {
      return { success: false, error: new OverflowError() };
    }
    
    // Round to precision to avoid floating-point artifacts
    const rounded = parseFloat(value.toPrecision(PRECISION));
    return { success: true, value: rounded };
  }
}

// ============================================================================
// EXPRESSION PARSER & EVALUATOR
// ============================================================================

/**
 * Main class that combines tokenization, parsing, and evaluation
 * into a single easy-to-use interface.
 */
export class ExpressionParser {
  private evaluator: Evaluator;

  constructor() {
    this.evaluator = new Evaluator();
  }

  /**
   * Parses and evaluates an expression string
   * 
   * @param expression - The mathematical expression to evaluate (e.g., "2 + 3 * 4")
   * @returns Result containing the computed value or an error
   * 
   * @example
   * const parser = new ExpressionParser();
   * const result = parser.evaluate("2 + 3 * 4"); // Returns 14 (not 20)
   * const result2 = parser.evaluate("(2 + 3) * 4"); // Returns 20
   * const result3 = parser.evaluate("10 / 0"); // Returns error
   */
  public evaluate(expression: string): EvalResult<number> {
    // Validate input
    if (!expression || expression.trim().length === 0) {
      return { success: false, error: new EmptyExpressionError() };
    }

    try {
      // Step 1: Tokenize
      const tokenizer = new Tokenizer(expression);
      const tokens = tokenizer.tokenize();

      // Step 2: Parse into AST
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Step 3: Evaluate the AST
      const result = this.evaluator.evaluate(ast);

      return result;
    } catch (error) {
      // Convert thrown errors to result format
      if (error instanceof EvaluationError) {
        return { success: false, error };
      }
      
      // Handle unexpected errors
      return {
        success: false,
        error: new InvalidExpressionError(
          error instanceof Error ? error.message : 'Unknown error occurred'
        )
      };
    }
  }

  /**
   * Parses an expression and returns the AST (for debugging/visualization)
   */
  public parse(expression: string): { ast: ASTNode | null; error: EvaluationError | null } {
    if (!expression || expression.trim().length === 0) {
      return { ast: null, error: new EmptyExpressionError() };
    }

    try {
      const tokenizer = new Tokenizer(expression);
      const tokens = tokenizer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      return { ast, error: null };
    } catch (error) {
      if (error instanceof EvaluationError) {
        return { ast: null, error };
      }
      return {
        ast: null,
        error: new InvalidExpressionError(
          error instanceof Error ? error.message : 'Unknown error occurred'
        )
      };
    }
  }

  /**
   * Tokenizes an expression and returns the tokens (for debugging)
   */
  public tokenize(expression: string): Token[] {
    const tokenizer = new Tokenizer(expression);
    return tokenizer.tokenize();
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Simple function to evaluate an expression string
 * Throws on error for convenience
 */
export function evaluateExpression(expression: string): number {
  const parser = new ExpressionParser();
  const result = parser.evaluate(expression);
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.value;
}

/**
 * Safe evaluation that returns null on error instead of throwing
 */
export function safeEvaluate(expression: string): number | null {
  try {
    return evaluateExpression(expression);
  } catch {
    return null;
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default ExpressionParser;
