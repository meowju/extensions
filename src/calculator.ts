/**
 * Calculator Module
 * 
 * [V3.6] Re-exports from calculator-canonical.ts for backward compatibility.
 * Single Source of Truth consolidation.
 */

import {
  add,
  subtract,
  multiply,
  divide,
  power,
  modulo,
  calculate,
  calculateStrict,
  calculateLegacy,
  velocity,
  validateInput,
  isValidNumber,
  formatNumber,
  cleanPrecision,
  ok,
  err,
  unwrap,
  unwrapOr,
  isOk,
  isErr,
  isValidOperation,
  OPERATION_SYMBOLS,
  CalculatorError,
  CalculatorErrorCode,
  calculator as defaultCalculator,
  Calculator as CalculatorClass,
  type Result,
  type Operation,
  type CalculatorState,
  type CalculationInput,
} from './calculator-canonical';

export type { Operation, CalculatorState, CalculationInput };
export type { Result };
export {
  add,
  subtract,
  multiply,
  divide,
  power,
  modulo,
  calculate,
  calculateStrict,
  calculateLegacy,
  validateInput,
  isValidNumber,
  formatNumber,
  cleanPrecision,
  ok,
  err,
  unwrap,
  unwrapOr,
  isOk,
  isErr,
  isValidOperation,
  OPERATION_SYMBOLS,
  CalculatorError,
  CalculatorErrorCode,
};

/**
 * Factory function to create a new Calculator instance
 * [V3.6] Added for backward compatibility with tests
 */
export interface CalculatorOptions {
  precision?: number;
  strictMode?: boolean;
}

export function createCalculator(options?: CalculatorOptions): CalculatorClass {
  const calc = new CalculatorClass();
  // Options can be used for future extensions (precision, strictMode, etc.)
  return calc;
}

// Re-export singleton calculator instance
export const calculator = defaultCalculator;

// Re-export the Calculator class
export { CalculatorClass as Calculator };
