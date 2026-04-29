/**
 * Calculator Core Operations
 * Type-safe basic arithmetic operations with comprehensive error handling
 */

// Custom error types for specific failure cases
export class DivisionByZeroError extends Error {
  readonly type = 'DivisionByZeroError';
  
  constructor() {
    super('Division by zero');
    this.name = 'DivisionByZeroError';
  }
}

export class ModuloByZeroError extends Error {
  readonly type = 'ModuloByZeroError';
  
  constructor() {
    super('Modulo by zero');
    this.name = 'ModuloByZeroError';
  }
}

// Type-safe Result type for handling success/error states
export type Result<T> = 
  | { success: true; value: T }
  | { success: false; error: string };

// Type for number operations
export type BinaryOperation = (a: number, b: number) => Result<number>;

// Operation precedence levels
export type PrecedenceLevel = 0 | 1 | 2 | 3;

// Associativity direction
export type AssociativityDirection = 'left' | 'right';

/**
 * Operation definition interface
 */
export interface OperationDefinition {
  symbol: string;
  precedence: PrecedenceLevel;
  associativity: AssociativityDirection;
  execute: BinaryOperation;
}

/**
 * Wraps a value in a successful Result
 */
function ok(value: number): Result<number> {
  return { success: true, value };
}

/**
 * Wraps an error in a failed Result
 */
function err(error: string): Result<number> {
  return { success: false, error };
}

/**
 * Validates that both operands are finite numbers
 */
function validateOperands(a: number, b: number): Result<number> | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return err('Invalid number: must be finite');
  }
  return null;
}

/**
 * Safe addition - always succeeds for valid numbers
 */
function add(a: number, b: number): Result<number> {
  const validation = validateOperands(a, b);
  if (validation) return validation;
  return ok(a + b);
}

/**
 * Safe subtraction - always succeeds for valid numbers
 */
function subtract(a: number, b: number): Result<number> {
  const validation = validateOperands(a, b);
  if (validation) return validation;
  return ok(a - b);
}

/**
 * Safe multiplication - always succeeds for valid numbers
 */
function multiply(a: number, b: number): Result<number> {
  const validation = validateOperands(a, b);
  if (validation) return validation;
  return ok(a * b);
}

/**
 * Safe division - handles division by zero
 */
function divide(a: number, b: number): Result<number> {
  const validation = validateOperands(a, b);
  if (validation) return validation;
  if (b === 0) {
    return err('Division by zero');
  }
  return ok(a / b);
}

/**
 * Safe modulo - handles modulo by zero
 */
function modulo(a: number, b: number): Result<number> {
  const validation = validateOperands(a, b);
  if (validation) return validation;
  if (b === 0) {
    return err('Modulo by zero');
  }
  return ok(a % b);
}

/**
 * Power operation - right associative
 */
function power(a: number, b: number): Result<number> {
  const validation = validateOperands(a, b);
  if (validation) return validation;
  return ok(Math.pow(a, b));
}

/**
 * BINARY_OPERATIONS map - contains all supported binary operations
 */
export const BINARY_OPERATIONS: Record<string, OperationDefinition> = {
  '+': {
    symbol: '+',
    precedence: 1,
    associativity: 'left',
    execute: add,
  },
  '-': {
    symbol: '-',
    precedence: 1,
    associativity: 'left',
    execute: subtract,
  },
  '*': {
    symbol: '*',
    precedence: 2,
    associativity: 'left',
    execute: multiply,
  },
  '/': {
    symbol: '/',
    precedence: 2,
    associativity: 'left',
    execute: divide,
  },
  '%': {
    symbol: '%',
    precedence: 2,
    associativity: 'left',
    execute: modulo,
  },
  '^': {
    symbol: '^',
    precedence: 3,
    associativity: 'right',
    execute: power,
  },
};

/**
 * Get precedence for an operator
 */
export function getPrecedence(op: string): PrecedenceLevel {
  const opDef = BINARY_OPERATIONS[op];
  return opDef ? opDef.precedence : 0;
}

/**
 * Get associativity for an operator
 */
export function getAssociativity(op: string): AssociativityDirection {
  const opDef = BINARY_OPERATIONS[op];
  return opDef ? opDef.associativity : 'left';
}

/**
 * Check if operator is valid
 */
export function isOperator(op: string): boolean {
  return op in BINARY_OPERATIONS;
}

/**
 * Operation result type for parser/evaluator
 */
export type OperationResult = Result<number>;

export interface OperationError {
  type: 'OperationError';
  message: string;
}

/**
 * Unary operations (postfix operators like factorial)
 */
function factorialOp(a: number): Result<number> {
  if (!Number.isFinite(a)) {
    return err('Factorial requires a finite number');
  }
  if (!Number.isInteger(a)) {
    return err('Factorial requires integer input');
  }
  if (a < 0) {
    return err('Factorial not defined for negative numbers');
  }
  if (a > 170) {
    return err('Factorial overflow (exceeds MAX_VALUE)');
  }
  
  // Calculate factorial iteratively
  let result = 1;
  for (let i = 2; i <= a; i++) {
    result *= i;
  }
  return ok(result);
}

/**
 * UNARY_OPERATIONS map - contains all supported unary/postfix operations
 */
export const UNARY_OPERATIONS: Record<string, { symbol: string; execute: (a: number) => Result<number> }> = {
  '!': {
    symbol: '!',
    execute: factorialOp,
  },
};

/**
 * Calculator class for method-based access
 */
export class Calculator {
  add(a: number, b: number): Result<number> {
    return add(a, b);
  }

  subtract(a: number, b: number): Result<number> {
    return subtract(a, b);
  }

  multiply(a: number, b: number): Result<number> {
    return multiply(a, b);
  }

  divide(a: number, b: number): Result<number> {
    return divide(a, b);
  }

  modulo(a: number, b: number): Result<number> {
    return modulo(a, b);
  }

  power(a: number, b: number): Result<number> {
    return power(a, b);
  }

  /**
   * Chain operations - applies operation and returns value if success
   */
  static chain<T>(result: Result<T>, fn: (value: T) => Result<T>): Result<T> {
    if (!result.success) return result;
    return fn(result.value);
  }
}

// Utility to unwrap result with default value
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  return result.success ? result.value : defaultValue;
}

// Utility to unwrap result or throw
export function unwrap<T>(result: Result<T>): T {
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.value;
}