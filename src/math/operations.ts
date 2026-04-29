/**
 * Calculator Operations
 * 
 * Implements basic arithmetic operations: add, subtract, multiply, divide.
 * Each operation is a pure function that takes two numbers and returns a result.
 * 
 * @module calculator
 * @version 1.0.0
 */

import { add } from './add';
import { subtract } from './subtract';
import { multiply } from './multiply';
import { divide } from './divide';

export { add, subtract, multiply, divide };

/** Calculator state for stateful operations */
export interface CalculatorState {
  currentValue: string;
  previousValue: string | null;
  operator: OperationType | null;
  waitingForOperand: boolean;
}

/** Supported operation types */
export type OperationType = 'add' | 'subtract' | 'multiply' | 'divide';

/** Result type for operations that can fail */
export type Result<T> =
  | { success: true; value: T }
  | { success: false; error: Error };

/** Operation mapping */
const operations: Record<OperationType, (a: number, b: number) => number> = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  },
};

/** Symbol mapping for display */
export const OPERATION_SYMBOLS: Record<OperationType, string> = {
  add: '+',
  subtract: '-',
  multiply: '×',
  divide: '÷',
};

/**
 * Validates if a string is a valid operation
 */
export function isValidOperation(op: unknown): op is OperationType {
  return typeof op === 'string' && op in operations;
}

/**
 * Performs a calculation with the given operation
 */
export function calculate(
  operation: OperationType,
  a: number,
  b: number
): Result<number> {
  try {
    const result = operations[operation](a, b);
    return { success: true, value: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
}

/**
 * Resolves operation string to OperationType
 */
export function resolveOperation(op: string): OperationType {
  const symbolMap: Record<string, OperationType> = {
    '+': 'add',
    '-': 'subtract',
    '*': 'multiply',
    '×': 'multiply',
    '/': 'divide',
    '÷': 'divide',
  };

  if (op in operations) return op as OperationType;
  const resolved = symbolMap[op];
  if (resolved) return resolved;
  throw new Error(`Unknown operation: ${op}`);
}

/**
 * Calculator class for stateful operations
 * Handles input sequencing for digit entry, operations, clear, and equals
 */
export class Calculator {
  private state: CalculatorState = {
    currentValue: '0',
    previousValue: null,
    operator: null,
    waitingForOperand: false,
  };

  /** Maximum number of digits allowed */
  private readonly MAX_DIGITS = 12;

  /**
   * Resets calculator to initial state
   * Equivalent to pressing "AC" (All Clear)
   */
  clear(): void {
    this.state = {
      currentValue: '0',
      previousValue: null,
      operator: null,
      waitingForOperand: false,
    };
  }

  /**
   * Clear entry (CE) - clears only the current value
   */
  clearEntry(): void {
    this.state.currentValue = '0';
  }

  /**
   * Input a digit (0-9)
   */
  inputDigit(digit: string): void {
    if (!/^[0-9]$/.test(digit)) return;

    const current = this.state.currentValue;

    if (this.state.waitingForOperand) {
      this.state.currentValue = digit;
      this.state.waitingForOperand = false;
      return;
    }

    // Limit digits
    const digitCount = current.replace(/[^0-9]/g, '').length;
    if (digitCount >= this.MAX_DIGITS) return;

    // Replace leading zero unless it's the only digit
    if (current === '0' && digit !== '0') {
      this.state.currentValue = digit;
    } else if (current !== '0' || digit === '0') {
      this.state.currentValue += digit;
    }
  }

  /**
   * Input decimal point
   */
  inputDecimal(): void {
    if (this.state.waitingForOperand) {
      this.state.currentValue = '0.';
      this.state.waitingForOperand = false;
      return;
    }

    if (!this.state.currentValue.includes('.')) {
      this.state.currentValue += '.';
    }
  }

  /**
   * Input an operator (+, -, ×, ÷)
   */
  inputOperator(operation: OperationType): void {
    const opSymbol = OPERATION_SYMBOLS[operation];

    if (!this.state.operator) {
      this.state.previousValue = this.state.currentValue;
      this.state.operator = operation;
      this.state.waitingForOperand = true;
      return;
    }

    // If waiting for operand, just update the operator
    if (this.state.waitingForOperand) {
      this.state.operator = operation;
      return;
    }

    // Perform pending calculation
    const prev = parseFloat(this.state.previousValue!);
    const current = parseFloat(this.state.currentValue);
    const result = calculate(this.state.operator, prev, current);

    if (result.success) {
      this.state.currentValue = this.formatResult(result.value);
      this.state.previousValue = this.state.currentValue;
    } else {
      this.state.currentValue = 'Error';
      this.state.operator = null;
      this.state.previousValue = null;
    }

    this.state.operator = operation;
    this.state.waitingForOperand = true;
  }

  /**
   * Evaluate the expression (equals)
   * Performs the pending operation and returns the result
   */
  equals(): Result<number> {
    if (!this.state.operator || this.state.previousValue === null) {
      const value = parseFloat(this.state.currentValue);
      return { success: true, value };
    }

    const prev = parseFloat(this.state.previousValue);
    const current = parseFloat(this.state.currentValue);
    const result = calculate(this.state.operator, prev, current);

    if (result.success) {
      this.state.currentValue = this.formatResult(result.value);
      this.state.operator = null;
      this.state.previousValue = null;
      this.state.waitingForOperand = true;
    } else {
      this.state.currentValue = 'Error';
      this.state.operator = null;
      this.state.previousValue = null;
    }

    return result;
  }

  /**
   * Toggle sign (positive/negative)
   */
  toggleSign(): void {
    const value = parseFloat(this.state.currentValue);
    this.state.currentValue = (value * -1).toString();
  }

  /**
   * Percent - divide current value by 100
   */
  percent(): void {
    const value = parseFloat(this.state.currentValue);
    this.state.currentValue = (value / 100).toString();
  }

  /**
   * Get current display value
   */
  getDisplay(): string {
    return this.state.currentValue;
  }

  /**
   * Get full state
   */
  getState(): Readonly<CalculatorState> {
    return { ...this.state };
  }

  /**
   * Format number for display
   */
  private formatResult(value: number): string {
    const str = value.toString();
    const [intPart, decPart] = str.split('.');
    if (!intPart) return '0';
    
    // Limit total digits
    const clean = intPart.replace(/-/, '').length + (decPart?.length ?? 0);
    if (clean > this.MAX_DIGITS) {
      return parseFloat(value.toPrecision(this.MAX_DIGITS - 1)).toString();
    }
    
    return str;
  }
}

// Default calculator instance
export const calculator = new Calculator();

// Operation shorthand functions for direct use
export function performAdd(a: number, b: number): number {
  return add(a, b);
}

export function performSubtract(a: number, b: number): number {
  return subtract(a, b);
}

export function performMultiply(a: number, b: number): number {
  return multiply(a, b);
}

export function performDivide(a: number, b: number): number {
  return divide(a, b);
}