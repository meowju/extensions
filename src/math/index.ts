import { 
  Calculator, 
  calculator, 
  calculate, 
  add, 
  subtract, 
  multiply, 
  divide,
  resolveOperation,
  OPERATION_SYMBOLS,
  isValidOperation,
  performAdd,
  performSubtract,
  performMultiply,
  performDivide,
  type OperationType,
} from './operations.js';

// Export types
export type { CalculatorState, Result } from './operations.js';
export type { OperationType };

// Re-export individual operations
export { add, subtract, multiply, divide };

// Export calculator functionality
export { 
  Calculator, 
  calculator, 
  calculate, 
  resolveOperation,
  OPERATION_SYMBOLS,
  isValidOperation,
  performAdd,
  performSubtract,
  performMultiply,
  performDivide,
};

// Reset calculator state
export function reset(): void {
  calculator.clear();
}

// Execute an operation on the calculator instance
export function operate(operation: OperationType, value: number): void {
  const calc = new Calculator();
  calc.inputOperator(operation);
}

// Default export
export default Calculator;