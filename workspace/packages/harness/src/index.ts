/**
 * Precision Calculator
 * 
 * A full-featured calculator with arithmetic operations,
 * keyboard support, and accessibility features.
 */

// Export types
export type { CalculatorState, CalculatorAction, Operation } from './types/Calculator';

// Export components
export { Calculator } from './components/Calculator';

// Export hooks
export { useCalculator } from './hooks/useCalculator';
export { useCalculatorKeyboard } from './hooks/useCalculatorKeyboard';

// Export utilities
export { calculate, formatNumber, performOperation } from './utils/calculator';
