/**
 * Calculator Core Module
 * Implements basic arithmetic operations with proper type safety and error handling
 */

/**
 * Custom error class for calculator-specific errors
 */
export class CalculatorError extends Error {
  constructor(
    message: string,
    public readonly code: CalculatorErrorCode,
    public readonly operation?: OperationType
  ) {
    super(message);
    this.name = 'CalculatorError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error codes for calculator operations
 */
export enum CalculatorErrorCode {
  DIVISION_BY_ZERO = 'DIVISION_BY_ZERO',
  MODULO_BY_ZERO = 'MODULO_BY_ZERO',
  INVALID_INPUT = 'INVALID_INPUT',
  OVERFLOW = 'OVERFLOW',
  UNDERFLOW = 'UNDERFLOW',
}

/**
 * Supported operation types
 */
export type OperationType = 'add' | 'subtract' | 'multiply' | 'divide' | 'modulo';

/**
 * Type representing a calculator result
 */
export interface CalculationResult {
  readonly value: number;
  readonly operation: OperationType;
  readonly operands: readonly [number, number];
  readonly timestamp: Date;
}

/**
 * Type representing an operation function
 */
export type OperationFunction = (a: number, b: number) => number;

/**
 * Configuration for calculator options
 */
export interface CalculatorOptions {
  readonly maxValue?: number;
  readonly minValue?: number;
  readonly precision?: number;
  readonly strictMode?: boolean;
}

/**
 * Default calculator options
 */
const DEFAULT_OPTIONS: Required<CalculatorOptions> = {
  maxValue: Number.MAX_SAFE_INTEGER,
  minValue: Number.MIN_SAFE_INTEGER,
  precision: 10,
  strictMode: true,
};

/**
 * Validates input numbers
 */
function validateInput(a: number, b: number, options: Required<CalculatorOptions>): void {
  if (options.strictMode) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new CalculatorError(
        'Invalid input: numbers must be finite',
        CalculatorErrorCode.INVALID_INPUT
      );
    }
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      throw new CalculatorError(
        'Invalid input: numbers must be integers',
        CalculatorErrorCode.INVALID_INPUT
      );
    }
  }

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new CalculatorError(
      'Invalid input: numbers must be finite',
      CalculatorErrorCode.INVALID_INPUT
    );
  }
}

/**
 * Validates result is within bounds
 */
function validateResult(
  result: number,
  operation: OperationType,
  operands: [number, number],
  options: Required<CalculatorOptions>
): void {
  if (result > options.maxValue) {
    throw new CalculatorError(
      `Result ${result} exceeds maximum value ${options.maxValue}`,
      CalculatorErrorCode.OVERFLOW,
      operation
    );
  }
  if (result < options.minValue) {
    throw new CalculatorError(
      `Result ${result} is below minimum value ${options.minValue}`,
      CalculatorErrorCode.UNDERFLOW,
      operation
    );
  }
}

/**
 * Rounds a number to specified precision
 */
function roundToPrecision(value: number, precision: number): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Core calculator class implementing arithmetic operations
 */
export class Calculator {
  private readonly options: Required<CalculatorOptions>;

  constructor(options: CalculatorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Performs addition
   */
  add(a: number, b: number): CalculationResult {
    validateInput(a, b, this.options);
    const result = roundToPrecision(a + b, this.options.precision);
    validateResult(result, 'add', [a, b], this.options);
    return this.createResult('add', a, b, result);
  }

  /**
   * Performs subtraction
   */
  subtract(a: number, b: number): CalculationResult {
    validateInput(a, b, this.options);
    const result = roundToPrecision(a - b, this.options.precision);
    validateResult(result, 'subtract', [a, b], this.options);
    return this.createResult('subtract', a, b, result);
  }

  /**
   * Performs multiplication
   */
  multiply(a: number, b: number): CalculationResult {
    validateInput(a, b, this.options);
    const result = roundToPrecision(a * b, this.options.precision);
    validateResult(result, 'multiply', [a, b], this.options);
    return this.createResult('multiply', a, b, result);
  }

  /**
   * Performs division with zero-check
   */
  divide(a: number, b: number): CalculationResult {
    validateInput(a, b, this.options);
    
    if (b === 0) {
      throw new CalculatorError(
        'Division by zero is not allowed',
        CalculatorErrorCode.DIVISION_BY_ZERO,
        'divide'
      );
    }
    
    const result = roundToPrecision(a / b, this.options.precision);
    validateResult(result, 'divide', [a, b], this.options);
    return this.createResult('divide', a, b, result);
  }

  /**
   * Performs modulo operation with zero-check
   */
  modulo(a: number, b: number): CalculationResult {
    validateInput(a, b, this.options);
    
    if (b === 0) {
      throw new CalculatorError(
        'Modulo by zero is not allowed',
        CalculatorErrorCode.MODULO_BY_ZERO,
        'modulo'
      );
    }
    
    const result = roundToPrecision(a % b, this.options.precision);
    validateResult(result, 'modulo', [a, b], this.options);
    return this.createResult('modulo', a, b, result);
  }

  /**
   * Executes an operation by name
   */
  execute(operation: OperationType, a: number, b: number): CalculationResult {
    switch (operation) {
      case 'add':
        return this.add(a, b);
      case 'subtract':
        return this.subtract(a, b);
      case 'multiply':
        return this.multiply(a, b);
      case 'divide':
        return this.divide(a, b);
      case 'modulo':
        return this.modulo(a, b);
      default:
        throw new CalculatorError(
          `Unknown operation: ${operation}`,
          CalculatorErrorCode.INVALID_INPUT
        );
    }
  }

  /**
   * Creates a standardized result object
   */
  private createResult(
    operation: OperationType,
    a: number,
    b: number,
    value: number
  ): CalculationResult {
    return Object.freeze({
      value,
      operation,
      operands: Object.freeze([a, b]),
      timestamp: new Date(),
    });
  }
}

/**
 * Factory function for creating a calculator with default options
 */
export function createCalculator(options?: CalculatorOptions): Calculator {
  return new Calculator(options);
}

// Export a default instance for convenience
export const calculator = new Calculator();