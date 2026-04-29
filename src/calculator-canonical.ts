/**
 * Calculator Canonical Implementation
 * 
 * Single Source of Truth (SSOT) for all calculator logic.
 * Consolidated in V3.6 from multiple redundant implementations.
 * 
 * Features:
 * - Type-safe arithmetic operations with Result pattern
 * - Memory functions (M+, M-, MR, MC)
 * - Operator precedence (PEMDAS: Parentheses, Exponents, Multiplication/Division, Addition/Subtraction)
 * - Chaining operations
 * - Comprehensive error handling
 * - Backspace support (keyboard and UI)
 * - Power operator (^) with proper precedence
 * - Decimal precision handling
 * 
 * @module calculator-canonical
 * @version 3.6.0
 * @unified-source true
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Supported arithmetic operations */
export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'modulo';

/** Result type for operations that can fail (Railway-oriented programming) */
export type Result<T> =
  | { success: true; value: T }
  | { success: false; error: Error };

/** Calculator state interface */
export interface CalculatorState {
  currentValue: string;
  previousValue: string | null;
  operator: Operation | null;
  waitingForOperand: boolean;
  hasError: boolean;
  expression: string;
  memory: number;
  /** [V3.6] Pending expression for operator precedence */
  pendingExpression: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_DIGITS = 12;
const DISPLAY_ERROR = 'Error';
const DISPLAY_MAX = 999999999999;
const DISPLAY_MIN = -999999999999;

/** Map of operation types to their display symbols */
export const OPERATION_SYMBOLS: Record<Operation, string> = {
  add: '+',
  subtract: '-',
  multiply: '×',
  divide: '÷',
  power: '^',
  modulo: '%',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates that a value is a valid finite number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Formats a number for display, handling overflow and precision
 */
export function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return String(value);
  if (!Number.isFinite(num)) return DISPLAY_ERROR;
  
  // Handle very large or very small numbers
  if (Math.abs(num) > DISPLAY_MAX || (num !== 0 && Math.abs(num) < 1e-10)) {
    return num.toExponential(6);
  }
  
  const str = num.toString();
  
  // Limit display length
  if (str.replace('-', '').replace('.', '').length > MAX_DIGITS) {
    return parseFloat(num.toPrecision(MAX_DIGITS - 1)).toString();
  }
  
  return str;
}

/**
 * Cleans floating point precision errors
 * e.g., 0.1 + 0.2 = 0.30000000000000004 -> 0.3
 */
export function cleanPrecision(value: number, precision: number = 12): number {
  return parseFloat(value.toPrecision(precision));
}

// ============================================================================
// RESULT HELPERS
// ============================================================================

/** Wraps a successful value in a Result */
export function ok<T>(value: T): Result<T> {
  return { success: true, value };
}

/** Wraps an error in a Result */
export function err<T>(error: Error): Result<T> {
  return { success: false, error };
}

/** Unwraps a Result, returning the value or throwing */
export function unwrap<T>(result: Result<T>): T {
  if (isOk(result)) return result.value;
  throw result.error;
}

/** Unwraps a Result, returning the value or a default */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  return result.success ? result.value : defaultValue;
}

/** Type guard to check if a result is successful */
export function isOk<T>(result: Result<T>): result is { success: true; value: T } {
  return result.success === true;
}

/** Type guard to check if a result is an error */
export function isErr<T>(result: Result<T>): result is { success: false; error: Error } {
  return result.success === false;
}

// ============================================================================
// CORE ARITHMETIC OPERATIONS
// ============================================================================

/**
 * Performs addition of two numbers
 */
export function add(a: number, b: number): Result<number> {
  if (!isValidNumber(a) || !isValidNumber(b)) {
    return err(new CalculatorError('Invalid operands', CalculatorErrorCode.INVALID_INPUT));
  }
  return ok(cleanPrecision(a + b));
}

/**
 * Performs subtraction of two numbers
 */
export function subtract(a: number, b: number): Result<number> {
  if (!isValidNumber(a) || !isValidNumber(b)) {
    return err(new CalculatorError('Invalid operands', CalculatorErrorCode.INVALID_INPUT));
  }
  return ok(cleanPrecision(a - b));
}

/**
 * Performs multiplication of two numbers
 */
export function multiply(a: number, b: number): Result<number> {
  if (!isValidNumber(a) || !isValidNumber(b)) {
    return err(new CalculatorError('Invalid operands', CalculatorErrorCode.INVALID_INPUT));
  }
  return ok(cleanPrecision(a * b));
}

/**
 * Performs division of two numbers
 */
export function divide(a: number, b: number): Result<number> {
  if (!isValidNumber(a) || !isValidNumber(b)) {
    return err(new CalculatorError('Invalid operands', CalculatorErrorCode.INVALID_INPUT));
  }
  if (b === 0) {
    return err(new CalculatorError('Division by zero is not allowed', CalculatorErrorCode.DIVISION_BY_ZERO, 'divide'));
  }
  return ok(cleanPrecision(a / b));
}

/**
 * Performs power operation (exponentiation)
 * [V3.6] Added power operation with proper precedence
 */
export function power(a: number, b: number): Result<number> {
  if (!isValidNumber(a) || !isValidNumber(b)) {
    return err(new CalculatorError('Invalid operands', CalculatorErrorCode.INVALID_INPUT));
  }
  const result = Math.pow(a, b);
  if (!Number.isFinite(result)) {
    return err(new CalculatorError('Result overflow', CalculatorErrorCode.OVERFLOW));
  }
  return ok(cleanPrecision(result));
}

/**
 * Performs modulo operation
 */
export function modulo(a: number, b: number): Result<number> {
  if (!isValidNumber(a) || !isValidNumber(b)) {
    return err(new CalculatorError('Invalid operands', CalculatorErrorCode.INVALID_INPUT));
  }
  if (b === 0) {
    return err(new CalculatorError('Modulo by zero is not allowed', CalculatorErrorCode.MODULO_BY_ZERO, 'modulo'));
  }
  return ok(a % b);
}

// ============================================================================
// OPERATION MAP
// ============================================================================

const operations: Record<Operation, (a: number, b: number) => Result<number>> = {
  add,
  subtract,
  multiply,
  divide,
  power,
  modulo,
};

// [V3.6] Symbol mapping for legacy API compatibility
const SYMBOL_MAP: Record<string, Operation> = {
  '+': 'add', 
  '-': 'subtract', 
  '*': 'multiply', // Fixed: was 'add'
  '×': 'multiply', 
  '/': 'divide', 
  '÷': 'divide',
  '^': 'power',
  '%': 'modulo',
};

function resolveOperation(op: string): Operation {
  if (isValidOperation(op)) return op as Operation;
  if (op in SYMBOL_MAP) return SYMBOL_MAP[op] as Operation;
  throw new Error(`Unknown operation: ${op}`);
}

/**
 * Validates if a string is a valid operation
 */
export function isValidOperation(op: unknown): op is Operation {
  return typeof op === 'string' && op in operations;
}

/**
 * Executes an arithmetic operation on two numbers
 */
export function calculate(input: CalculationInput): Result<number>;
export function calculate(operation: Operation, a: number, b: number): Result<number>;
export function calculate(opOrInput: Operation | CalculationInput, a?: number, b?: number): Result<number> {
  // Handle legacy object-based API
  if (typeof opOrInput === 'object') {
    const { operand1, operand2, operation } = opOrInput;
    try {
      const op = resolveOperation(operation);
      return operations[op](operand1, operand2);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
  
  // Standard function call
  if (!isValidOperation(opOrInput)) {
    return err(new Error(`Unknown operation: ${opOrInput}`));
  }
  return operations[opOrInput](a!, b!);
}

// [V3.6] Legacy object-based API for backward compatibility with tests
export interface CalculationInput {
  operand1: number;
  operand2: number;
  operation: string;
}

/** Validates calculation input (legacy API) */
export function validateInput(input: unknown): input is CalculationInput {
  if (!input || typeof input !== 'object') return false;
  const { operand1, operand2, operation } = input as Record<string, unknown>;
  if (typeof operand1 !== 'number' || typeof operand2 !== 'number') return false;
  if (typeof operation !== 'string') return false;
  try {
    resolveOperation(operation);
    return true;
  } catch {
    return false;
  }
}

/** Calculate with object input (legacy API for tests) */
export function calculateLegacy(input: CalculationInput): Result<number> {
  const { operand1, operand2, operation } = input;
  try {
    const op = resolveOperation(operation);
    return calculate(op, operand1, operand2);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

/** Strict version throws on error */
export function calculateStrict(input: CalculationInput): number {
  const result = calculateLegacy(input);
  if (isOk(result)) return result.value;
  throw result.error;
}

// ============================================================================
// OPERATOR PRECEDENCE (PEMDAS)
// ============================================================================

/**
 * Operator precedence for proper calculation order
 * Higher number = higher precedence
 * 
 * Order of operations (PEMDAS):
 * 1. Parentheses (handled separately)
 * 2. Exponents (power) - precedence 3
 * 3. Multiplication/Division/Modulo - precedence 2
 * 4. Addition/Subtraction - precedence 1
 */
const PRECEDENCE: Record<string, number> = {
  // Operation names
  'add': 1,
  'subtract': 1,
  'multiply': 2,
  'divide': 2,
  'modulo': 2,
  'power': 3, // Right-associative
  // ASCII operators
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 2,
  '^': 3,
};

/** Right-associative operators (^ is right-associative: 2^3^2 = 2^(3^2) = 512) */
const RIGHT_ASSOC: ReadonlySet<string> = new Set(['power']);

// ============================================================================
// CALCULATOR CLASS
// ============================================================================

/**
 * Stateful calculator with input handling for digits, operators,
 * clear, and backspace functionality
 * 
 * [V3.6] Key fixes:
 * - Fixed operator precedence (2 + 3 * 4 = 14)
 * - Fixed power associativity (2 ^ 3 ^ 2 = 512)
 * - Fixed backspace behavior
 * - Fixed memory operations
 */
export class Calculator {
  private _state: CalculatorState;
  
  constructor() {
    this._state = this.createInitialState();
  }

  private createInitialState(): CalculatorState {
    return {
      currentValue: '0',
      previousValue: null,
      operator: null,
      waitingForOperand: false,
      hasError: false,
      expression: '',
      memory: 0,
      pendingExpression: null,
    };
  }

  // --------------------------------------------------------------------------
  // State Accessors
  // --------------------------------------------------------------------------

  get currentValue(): string { return this._state.currentValue; }
  get previousValue(): string | null { return this._state.previousValue; }
  get operator(): Operation | null { return this._state.operator; }
  get hasError(): boolean { return this._state.hasError; }
  get isWaitingForOperand(): boolean { return this._state.waitingForOperand; }
  get expression(): string { return this._state.expression; }
  get memory(): number { return this._state.memory; }

  get state(): Readonly<CalculatorState> {
    return { ...this._state };
  }

  // --------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------

  /** Resets the calculator to initial state (preserves memory) */
  clear(): void {
    const memory = this._state.memory; // Preserve memory
    this._state = this.createInitialState();
    this._state.memory = memory;
  }

  /** Clears memory */
  clearMemory(): void {
    this._state.memory = 0;
  }

  // --------------------------------------------------------------------------
  // Input Handlers
  // --------------------------------------------------------------------------

  /** Handles digit input (0-9) */
  inputDigit(digit: string): void {
    if (this._state.hasError) return;
    if (!/^[0-9]$/.test(digit)) return;

    if (this._state.waitingForOperand) {
      this._state.currentValue = digit;
      this._state.waitingForOperand = false;
      return;
    }

    const digitCount = this._state.currentValue.replace(/[^0-9]/g, '').length;
    if (digitCount >= MAX_DIGITS) return;

    if (this._state.currentValue === '0' && digit !== '0') {
      this._state.currentValue = digit;
    } else if (this._state.currentValue !== '0' || digit === '0') {
      this._state.currentValue += digit;
    }
  }

  /** Handles decimal point input */
  inputDecimal(): void {
    if (this._state.hasError) return;

    if (this._state.waitingForOperand) {
      this._state.currentValue = '0.';
      this._state.waitingForOperand = false;
      return;
    }

    if (!this._state.currentValue.includes('.')) {
      this._state.currentValue += '.';
    }
  }

  /** 
   * Handles operator input with proper precedence evaluation
   * [V3.6] Fixed: Now correctly handles 2 + 3 * 4 = 14 using string expression building
   */
  inputOperator(operation: Operation): void {
    if (this._state.hasError) return;

    const opSymbol = OPERATION_SYMBOLS[operation];
    
    // If no operator yet, just store the current value and operator
    if (!this._state.operator) {
      this._state.previousValue = this._state.currentValue;
      this._state.operator = operation;
      this._state.waitingForOperand = true;
      this._state.expression = `${this._state.previousValue} ${opSymbol}`;
      this._state.pendingExpression = `${this._state.previousValue} ${opSymbol}`;
      return;
    }

    // If waiting for operand and we already have an operator, 
    // user is replacing the operator (e.g., typed 2+3, then pressed * instead of =)
    if (this._state.waitingForOperand) {
      this._state.operator = operation;
      this._state.expression = `${this._state.previousValue} ${opSymbol}`;
      this._state.pendingExpression = `${this._state.previousValue} ${opSymbol}`;
      return;
    }

    // We have an operator and are NOT waiting for operand
    // Build the expression with current values
    const currentExpr = this._state.pendingExpression || '';
    const newExpr = currentExpr + this._state.currentValue + ' ' + opSymbol;
    
    // Store the partial expression
    this._state.pendingExpression = newExpr;
    this._state.previousValue = this._state.currentValue;
    this._state.operator = operation;
    this._state.waitingForOperand = true;
    this._state.expression = newExpr;
  }

  /** 
   * [V3.6] Power operator input (^)
   * Shorthand for using power operation
   */
  inputPower(): void {
    this.inputOperator('power');
  }

  /** Handles equals/evaluate with proper operator precedence */
  evaluate(): void {
    if (this._state.hasError) return;
    
    // If no operator, just return current value
    if (!this._state.operator || !this._state.previousValue) {
      return;
    }
    
    // Build full expression for proper precedence evaluation
    let expr: string;
    if (this._state.pendingExpression) {
      // Append the final operand to the pending expression
      expr = this._state.pendingExpression + this._state.currentValue;
    } else {
      // Simple case: just evaluate the current operation
      const currentOpSymbol = OPERATION_SYMBOLS[this._state.operator] ?? this._state.operator;
      expr = `${this._state.previousValue} ${currentOpSymbol} ${this._state.currentValue}`;
    }
    
    try {
      const result = this.evaluateExpression(expr);
      if (!Number.isFinite(result)) {
        this._state.hasError = true;
        this._state.currentValue = DISPLAY_ERROR;
      } else {
        this._state.currentValue = formatNumber(cleanPrecision(result));
        this._state.expression = `${expr} =`;
      }
    } catch (e) {
      this._state.hasError = true;
      this._state.currentValue = DISPLAY_ERROR;
    }
    
    // Reset state
    this._state.operator = null;
    this._state.previousValue = null;
    this._state.pendingExpression = null;
    this._state.expression = '';
    this._state.waitingForOperand = true;
  }

  /** 
   * [V3.6] Backspace handler - removes the last digit
   * Fixed: Properly handles negative numbers and single-digit values
   */
  backspace(): void {
    if (this._state.hasError) {
      this.clear();
      return;
    }

    if (this._state.waitingForOperand) return;

    const current = this._state.currentValue;
    // If only one character or negative single digit, reset to 0
    if (current.length <= 1 || (current.length === 2 && current[0] === '-')) {
      this._state.currentValue = '0';
      return;
    }

    this._state.currentValue = current.slice(0, -1);
  }

  /** Negate handler - switches sign (±) */
  negate(): void {
    if (this._state.hasError || this._state.waitingForOperand) return;
    const value = parseFloat(this._state.currentValue);
    this._state.currentValue = (value * -1).toString();
  }

  /** Percent handler - divides by 100 */
  percent(): void {
    if (this._state.hasError || this._state.waitingForOperand) return;
    const value = parseFloat(this._state.currentValue);
    this._state.currentValue = (value / 100).toString();
  }

  /** Memory operations */
  memoryAdd(): void {
    const value = parseFloat(this._state.currentValue);
    if (!isNaN(value)) this._state.memory += value;
  }

  memorySubtract(): void {
    const value = parseFloat(this._state.currentValue);
    if (!isNaN(value)) this._state.memory -= value;
  }

  /** [V3.6] Fixed memory recall to work properly */
  memoryRecall(): void {
    // Always recall memory value, overriding current value
    this._state.currentValue = this._state.memory.toString();
    this._state.waitingForOperand = true;
  }

  // --------------------------------------------------------------------------
  // Internal Methods
  // --------------------------------------------------------------------------

  private calculateResult(): void {
    if (!this._state.operator || !this._state.previousValue) return;

    const prev = parseFloat(this._state.previousValue);
    const current = parseFloat(this._state.currentValue);
    const result = calculate(this._state.operator, prev, current);

    if (result.success) {
      this._state.currentValue = formatNumber(result.value);
    } else {
      this._state.hasError = true;
      this._state.currentValue = DISPLAY_ERROR;
      this._state.previousValue = null;
      this._state.operator = null;
      this._state.expression = '';
    }

    this._state.waitingForOperand = true;
  }

  // ============================================================================
  // LEGACY METHOD ALIASES (for backward compatibility with existing tests)
  // ============================================================================

  /** [Legacy] Alias for inputDigit */
  digit(char: string): void {
    for (const c of char) {
      if (/^[0-9]$/.test(c)) {
        this.inputDigit(c);
      }
    }
  }

  /** [Legacy] Input operator by symbol string */
  inputOperatorSymbol(op: string): void {
    const symbolToOp: Record<string, Operation> = {
      '+': 'add', '-': 'subtract', '*': 'multiply', '×': 'multiply',
      '/': 'divide', '÷': 'divide', '^': 'power', '%': 'modulo',
    };
    const operation = symbolToOp[op] ?? op as Operation;
    if (isValidOperation(operation)) {
      this.inputOperator(operation);
    }
  }

  /** [Legacy] Alias for inputOperatorSymbol */
  legacyOperator(op: string): void {
    this.inputOperatorSymbol(op);
  }

  /** 
   * [Legacy] Equals - handles operator precedence properly
   * [V3.6] Fixed: 2 + 3 * 4 = 14, 2 ^ 3 ^ 2 = 512
   */
  equals(): Result<number> {
    if (this._state.hasError) {
      return err(new Error('Calculator in error state'));
    }
    if (!this._state.operator || !this._state.previousValue) {
      return ok(parseFloat(this._state.currentValue));
    }
    
    // Build expression string for proper precedence evaluation
    let expr: string;
    if (this._state.pendingExpression) {
      expr = this._state.pendingExpression + this._state.currentValue;
    } else {
      const currentOpSymbol = OPERATION_SYMBOLS[this._state.operator] ?? this._state.operator;
      expr = `${this._state.previousValue} ${currentOpSymbol} ${this._state.currentValue}`;
    }
    
    try {
      const result = this.evaluateExpression(expr);
      if (!Number.isFinite(result)) {
        return err(new Error('Calculation overflow'));
      }
      
      const cleanResult = cleanPrecision(result);
      this._state.currentValue = formatNumber(cleanResult);
      
      this._state.waitingForOperand = true;
      this._state.operator = null;
      this._state.previousValue = null;
      this._state.pendingExpression = null;
      this._state.expression = `${expr} =`;
      
      return ok(cleanResult);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /** [Legacy] Alias for get currentValue */
  getDisplay(): string {
    if (this._state.hasError) return DISPLAY_ERROR;
    return this._state.currentValue;
  }

  /** [Legacy] Alias for clear */
  clearAll(): void {
    this.clear();
  }

  /** [Legacy] Alias for memory store */
  memoryStore(): void {
    this._state.memory = parseFloat(this._state.currentValue);
  }

  /** [Legacy] Alias for clearMemory */
  memoryClear(): void {
    this.clearMemory();
  }

  /** [Legacy] Returns calculation history (placeholder) */
  getHistory(): string[] {
    return [];
  }

  /** [Legacy] Clears history */
  clearHistory(): void {
    // History tracking not yet implemented
  }

  /** [Legacy] Alias for inputDecimal */
  decimal(): void {
    this.inputDecimal();
  }

  /** [Legacy] Alias for negate */
  toggleSign(): void {
    this.negate();
  }

  /** [Legacy] Clear current entry only */
  clearEntry(): void {
    if (this._state.hasError) {
      this.clear();
      return;
    }
    this._state.currentValue = '0';
  }

  /** [Legacy] Get full state object */
  getState(): Readonly<CalculatorState> {
    return { ...this._state };
  }

  /** 
   * [Legacy] Evaluate string expression with proper operator precedence
   * [V3.6] Fixed: Now correctly evaluates "2 + 3 * 4" as 14 using shunting-yard
   */
  evaluateExpressionString(expr: string): Result<number> {
    const trimmed = expr.trim();
    if (!trimmed) return err(new Error('Empty expression'));
    
    try {
      const result = this.evaluateExpression(trimmed);
      const cleanResult = cleanPrecision(result);
      this._state.currentValue = formatNumber(cleanResult);
      return ok(cleanResult);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /** 
   * [V3.6] Evaluate expression string using shunting-yard algorithm
   * Correctly handles: 2 + 3 * 4 = 14, 2 ^ 3 ^ 2 = 512 (right-assoc)
   */
  private evaluateExpression(expr: string): number {
    const tokens = this.tokenize(expr);
    return this.shuntingYard(tokens);
  }

  /** Tokenize expression into numbers and operators */
  private tokenize(expr: string): Array<string | number> {
    const tokens: Array<string | number> = [];
    let i = 0;
    
    // Normalize operators to ASCII for easier parsing
    const normalized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');
    
    while (i < normalized.length) {
      const char = normalized[i];
      if (char === undefined) {
        i++;
        continue;
      }
      
      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }
      
      // Handle parentheses
      if (char === '(' || char === ')') {
        tokens.push(char);
        i++;
        continue;
      }
      
      // Handle negative numbers at start or after operator or '('
      const lastToken = tokens[tokens.length - 1];
      if (char === '-' && (tokens.length === 0 || (lastToken !== undefined && ['+', '-', '*', '/', '^', '%', '('].includes(String(lastToken))))) {
        i++;
        let num = '-';
        while (i < normalized.length) {
          const nextChar = normalized[i];
          if (nextChar !== undefined && /[0-9.]/.test(nextChar)) {
            num += nextChar;
            i++;
          } else {
            break;
          }
        }
        if (num !== '-') {
          tokens.push(parseFloat(num));
        }
        continue;
      }
      
      // Numbers (including decimals)
      if (/[0-9.]/.test(char)) {
        let num = '';
        while (i < normalized.length) {
          const nextChar = normalized[i];
          if (nextChar !== undefined && /[0-9.]/.test(nextChar)) {
            num += nextChar;
            i++;
          } else {
            break;
          }
        }
        tokens.push(parseFloat(num));
      }
      // Operators
      else if (['+', '-', '*', '/', '^', '%'].includes(char)) {
        tokens.push(char);
        i++;
      }
      else {
        throw new Error(`Unexpected character: ${char}`);
      }
    }
    
    return tokens;
  }

  /** 
   * [V3.6] Shunting-yard algorithm for proper operator precedence
   * Precedence: power (3) > mult/div (2) > add/sub (1)
   * Associativity: power is right-assoc, others are left-assoc
   * [V3.6 FIX] Fixed right-associativity: 2 ^ 3 ^ 2 = 2^(3^2) = 512
   */
  private shuntingYard(tokens: Array<string | number>): number {
    const output: number[] = [];
    const ops: string[] = [];
    const parens: string[] = [];
    
    // Normalize operators to ASCII
    const normalizeOp = (op: string): string => {
      switch (op) {
        case '×': return '*';
        case '÷': return '/';
        case '−': return '-';
        default: return op;
      }
    };
    
    for (const token of tokens) {
      if (typeof token === 'number') {
        output.push(token);
      } else if (token === '(') {
        parens.push('(');
        ops.push('(');
      } else if (token === ')') {
        // Pop until matching '('
        while (ops.length > 0 && ops[ops.length - 1] !== '(') {
          const op = ops.pop()!;
          const b = output.pop()!;
          const a = output.pop()!;
          output.push(this.applyOp(op, a, b));
        }
        // Remove the '('
        if (ops.length > 0 && ops[ops.length - 1] === '(') {
          ops.pop();
        }
        parens.pop();
      } else if (['+', '-', '*', '/', '^', '%', '×', '÷', '−'].includes(String(token))) {
        const op = normalizeOp(String(token));
        const prec = PRECEDENCE[op] ?? 0;
        const isRightAssoc = op === '^';
        
        while (ops.length > 0 && ops[ops.length - 1] !== '(') {
          const top = normalizeOp(ops[ops.length - 1]);
          const topPrec = PRECEDENCE[top] ?? 0;
          
          // Pop if: top has higher precedence OR (same prec AND not right-assoc)
          const shouldPop = topPrec > prec || (topPrec === prec && !isRightAssoc);
          
          if (shouldPop) {
            const poppedOp = ops.pop()!;
            const b = output.pop()!;
            const a = output.pop()!;
            output.push(this.applyOp(poppedOp, a, b));
          } else {
            break;
          }
        }
        ops.push(op);
      }
    }
    
    // Apply remaining operators
    while (ops.length > 0) {
      const op = ops.pop()!;
      if (op === '(') continue; // Skip leftover parens
      const b = output.pop()!;
      const a = output.pop()!;
      output.push(this.applyOp(op, a, b));
    }
    
    return output[0] ?? 0;
  }

  /** Apply binary operator to two operands (a op b) */
  private applyOp(op: string, a: number, b: number): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': 
        if (b === 0) throw new Error('Division by zero');
        return a / b;
      case '%':
        if (b === 0) throw new Error('Modulo by zero');
        return a % b;
      case '^': return Math.pow(a, b);
      default: throw new Error(`Unknown operator: ${op}`);
    }
  }

  // ============================================================================
  // LEGACY MATH METHODS (for backward compatibility with tests)
  // ============================================================================

  /** [Legacy] Direct math - add */
  add(a: number, b: number): number {
    const result = operations['add'](a, b);
    if (isOk(result)) return result.value;
    throw result.error;
  }

  /** [Legacy] Direct math - subtract */
  subtract(a: number, b: number): number {
    const result = operations['subtract'](a, b);
    if (isOk(result)) return result.value;
    throw result.error;
  }

  /** [Legacy] Direct math - multiply */
  multiply(a: number, b: number): number {
    const result = operations['multiply'](a, b);
    if (isOk(result)) return result.value;
    throw result.error;
  }

  /** [Legacy] Direct math - divide */
  divide(a: number, b: number): number {
    const result = operations['divide'](a, b);
    if (isOk(result)) return result.value;
    throw result.error;
  }

  /** [Legacy] Direct math - modulo */
  modulo(a: number, b: number): number {
    const result = operations['modulo'](a, b);
    if (isOk(result)) return result.value;
    throw result.error;
  }

  /** [Legacy] Chainable operations */
  chain(ops: Array<{ op: string; value: number }>): number {
    let current = parseFloat(this._state.currentValue);
    for (const { op, value } of ops) {
      const result = calculate(resolveOperation(op), current, value);
      if (isErr(result)) throw result.error;
      current = result.value;
    }
    return current;
  }
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class CalculatorError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly operation?: string
  ) {
    super(message);
    this.name = 'CalculatorError';
  }
}

export const CalculatorErrorCode = {
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  MODULO_BY_ZERO: 'MODULO_BY_ZERO',
  OVERFLOW: 'OVERFLOW',
  INVALID_INPUT: 'INVALID_INPUT',
  UNKNOWN_OPERATION: 'UNKNOWN_OPERATION',
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

export default Calculator;

// Singleton calculator instance
export const calculator = new Calculator();