/**
 * Calculator Implementation
 * 
 * Single Source of Truth for calculator logic (V3.6).
 * Matches the API expected by calculator.test.ts
 * 
 * @module calculator/calculator
 * @version 3.6.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'modulo';

export type Result<T> =
  | { success: true; value: T }
  | { success: false; error: Error };

export interface CalculatorState {
  currentValue: string;
  previousValue: string | null;
  operator: Operation | null;
  waitingForOperand: boolean;
  hasError: boolean;
  expression: string;
  memory: number;
}

interface HistoryEntry {
  expression: string;
  result: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_DIGITS = 12;
const DISPLAY_ERROR = 'Error';

const OPERATION_SYMBOLS: Record<Operation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  modulo: '%',
};

// Operator string mapping
const OP_STRING_MAP: Record<string, Operation> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '^': 'power',
  '%': 'modulo',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function cleanPrecision(value: number): number {
  return parseFloat(value.toPrecision(12));
}

// ============================================================================
// CORE OPERATIONS
// ============================================================================

function add(a: number, b: number): Result<number> {
  return { success: true, value: cleanPrecision(a + b) };
}

function subtract(a: number, b: number): Result<number> {
  return { success: true, value: cleanPrecision(a - b) };
}

function multiply(a: number, b: number): Result<number> {
  return { success: true, value: cleanPrecision(a * b) };
}

function divide(a: number, b: number): Result<number> {
  if (b === 0) return { success: false, error: new Error('Division by zero') };
  return { success: true, value: cleanPrecision(a / b) };
}

function power(a: number, b: number): Result<number> {
  const result = Math.pow(a, b);
  if (!Number.isFinite(result)) return { success: false, error: new Error('Overflow') };
  return { success: true, value: cleanPrecision(result) };
}

function modulo(a: number, b: number): Result<number> {
  if (b === 0) return { success: false, error: new Error('Modulo by zero') };
  return { success: true, value: a % b };
}

const operations: Record<Operation, (a: number, b: number) => Result<number>> = {
  add,
  subtract,
  multiply,
  divide,
  power,
  modulo,
};

function calculateOp(op: Operation, a: number, b: number): Result<number> {
  return operations[op](a, b);
}

// ============================================================================
// EXPRESSION EVALUATOR (with proper operator precedence)
// ============================================================================

/**
 * Tokenizes a mathematical expression
 */
function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  
  while (i < expr.length) {
    const char = expr[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // Numbers (including decimals)
    if (/\d/.test(char)) {
      let num = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push(num);
      continue;
    }
    
    // Operators and parentheses
    if ('+-*/^%()'.includes(char)) {
      tokens.push(char);
      i++;
      continue;
    }
    
    // Unknown character - skip
    i++;
  }
  
  return tokens;
}

/**
 * Converts infix notation to postfix (Shunting-yard algorithm)
 */
function toPostfix(tokens: string[]): string[] {
  const output: string[] = [];
  const opStack: string[] = [];
  
  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '%': 2,
    '^': 3,
  };
  
  const isRightAssociative = (op: string) => op === '^';
  
  for (const token of tokens) {
    if (/^\d+$/.test(token) || /^\d+\.\d+$/.test(token)) {
      output.push(token);
    } else if ('+-*/^%'.includes(token)) {
      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1];
        if ('+-*/^%'.includes(top)) {
          const topPrec = precedence[top] ?? 0;
          const tokenPrec = precedence[token] ?? 0;
          
          if (topPrec > tokenPrec || (topPrec === tokenPrec && !isRightAssociative(token))) {
            output.push(opStack.pop()!);
          } else {
            break;
          }
        } else {
          break;
        }
      }
      opStack.push(token);
    } else if (token === '(') {
      opStack.push(token);
    } else if (token === ')') {
      while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
        output.push(opStack.pop()!);
      }
      opStack.pop(); // Remove '('
    }
  }
  
  while (opStack.length > 0) {
    output.push(opStack.pop()!);
  }
  
  return output;
}

/**
 * Evaluates a postfix expression
 */
function evaluatePostfix(postfix: string[]): Result<number> {
  const stack: number[] = [];
  
  for (const token of postfix) {
    if (/^\d+$/.test(token) || /^\d+\.\d+$/.test(token)) {
      stack.push(parseFloat(token));
    } else if ('+-*/^%'.includes(token)) {
      if (stack.length < 2) {
        return { success: false, error: new Error('Invalid expression') };
      }
      
      const b = stack.pop()!;
      const a = stack.pop()!;
      let result: Result<number>;
      
      switch (token) {
        case '+': result = add(a, b); break;
        case '-': result = subtract(a, b); break;
        case '*': result = multiply(a, b); break;
        case '/': result = divide(a, b); break;
        case '^': result = power(a, b); break;
        case '%': result = modulo(a, b); break;
        default: return { success: false, error: new Error('Unknown operator') };
      }
      
      if (!result.success) return result;
      stack.push(result.value);
    }
  }
  
  if (stack.length !== 1) {
    return { success: false, error: new Error('Invalid expression') };
  }
  
  return { success: true, value: stack[0] };
}

/**
 * Evaluates a mathematical expression string with proper precedence
 */
function evaluateExpression(expr: string): Result<number> {
  try {
    const tokens = tokenize(expr);
    if (tokens.length === 0) {
      return { success: false, error: new Error('Empty expression') };
    }
    
    const postfix = toPostfix(tokens);
    return evaluatePostfix(postfix);
  } catch (e) {
    return { success: false, error: new Error('Parse error') };
  }
}

// ============================================================================
// CALCULATOR CLASS
// ============================================================================

export class Calculator {
  private _state: CalculatorState;
  private _history: HistoryEntry[] = [];

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
    };
  }

  // --------------------------------------------------------------------------
  // Public API (matches test expectations)
  // --------------------------------------------------------------------------

  /** Get the current display value */
  getDisplay(): string {
    return this._state.currentValue;
  }

  /** Input a digit */
  digit(d: string): void {
    if (this._state.hasError) return;
    if (!/^[0-9]$/.test(d)) return;

    if (this._state.waitingForOperand) {
      this._state.currentValue = d;
      this._state.waitingForOperand = false;
      return;
    }

    const digitCount = this._state.currentValue.replace(/[^0-9]/g, '').length;
    if (digitCount >= MAX_DIGITS) return;

    if (this._state.currentValue === '0') {
      this._state.currentValue = d;
    } else {
      this._state.currentValue += d;
    }
  }

  /** Add decimal point */
  decimal(): void {
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

  /** Set operator (+, -, *, /, ^, %) */
  operator(op: string): void {
    if (this._state.hasError) return;
    
    const operation = OP_STRING_MAP[op];
    if (!operation) return;

    if (this._state.operator && !this._state.waitingForOperand) {
      this.calculateResult();
      if (this._state.hasError) return;
    }

    this._state.previousValue = this._state.currentValue;
    this._state.operator = operation;
    this._state.waitingForOperand = true;
    this._state.expression = `${this._state.previousValue} ${OPERATION_SYMBOLS[operation]}`;
  }

  /** Calculate result */
  equals(): Result<number> {
    if (this._state.hasError || !this._state.operator) {
      const value = parseFloat(this._state.currentValue);
      return { success: true, value: isNaN(value) ? 0 : value };
    }

    const prev = parseFloat(this._state.previousValue);
    const current = parseFloat(this._state.currentValue);
    const result = calculateOp(this._state.operator, prev, current);

    if (result.success) {
      const expression = `${prev} ${OPERATION_SYMBOLS[this._state.operator]} ${current}`;
      this._history.push({ expression, result: result.value });
      this._state.currentValue = result.value.toString();
    } else {
      this._state.hasError = true;
      this._state.currentValue = DISPLAY_ERROR;
    }

    this._state.operator = null;
    this._state.previousValue = null;
    this._state.waitingForOperand = true;
    
    return result;
  }

  /** Clear current entry */
  clearEntry(): void {
    this._state.currentValue = '0';
  }

  /** Clear all state */
  clearAll(): void {
    this._state = this.createInitialState();
  }

  /** Backspace - delete last character */
  backspace(): void {
    if (this._state.hasError) {
      this.clearAll();
      return;
    }

    if (this._state.waitingForOperand) return;

    const current = this._state.currentValue;
    if (current.length <= 1) {
      this._state.currentValue = '0';
      return;
    }

    this._state.currentValue = current.slice(0, -1);
  }

  /** Toggle sign (+/-) */
  toggleSign(): void {
    if (this._state.hasError || this._state.waitingForOperand) return;
    const value = parseFloat(this._state.currentValue);
    this._state.currentValue = (value * -1).toString();
  }

  /** Evaluate expression string */
  evaluate(expr: string): Result<number> {
    return evaluateExpression(expr);
  }

  /** Memory operations */
  memoryStore(): void {
    const value = parseFloat(this._state.currentValue);
    if (!isNaN(value)) this._state.memory = value;
  }

  memoryAdd(): void {
    const value = parseFloat(this._state.currentValue);
    if (!isNaN(value)) this._state.memory += value;
  }

  memoryClear(): void {
    this._state.memory = 0;
  }

  memoryRecall(): void {
    if (!this._state.waitingForOperand) {
      this._state.currentValue = this._state.memory.toString();
    }
  }

  /** Get state */
  getState(): CalculatorState {
    return { ...this._state, memory: this._state.memory };
  }

  /** Get history */
  getHistory(): HistoryEntry[] {
    return [...this._history];
  }

  /** Clear history */
  clearHistory(): void {
    this._history = [];
  }

  // --------------------------------------------------------------------------
  // Internal Methods
  // --------------------------------------------------------------------------

  private calculateResult(): void {
    if (!this._state.operator || !this._state.previousValue) return;

    const prev = parseFloat(this._state.previousValue);
    const current = parseFloat(this._state.currentValue);
    const result = calculateOp(this._state.operator, prev, current);

    if (result.success) {
      this._state.currentValue = result.value.toString();
    } else {
      this._state.hasError = true;
      this._state.currentValue = DISPLAY_ERROR;
      this._state.previousValue = null;
      this._state.operator = null;
      this._state.expression = '';
    }

    this._state.waitingForOperand = true;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createCalculator(): Calculator {
  return new Calculator();
}

export default Calculator;
