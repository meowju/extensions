/**
 * Calculator Types
 * 
 * Type definitions for the precision calculator.
 */

/**
 * Supported arithmetic operations
 */
export type Operation = '+' | '-' | '×' | '÷' | '^' | null;

/**
 * Calculator state interface
 */
export interface CalculatorState {
  /** Current display value */
  currentValue: string;
  /** First operand for pending operation */
  previousValue: string | null;
  /** Current pending operation */
  operation: Operation;
  /** Flag indicating next digit starts new number */
  waitingForOperand: boolean;
  /** Error state flag */
  error: boolean;
  /** Expression to display (e.g., "25 +") */
  expression: string;
}

/**
 * Initial calculator state
 */
export const INITIAL_STATE: CalculatorState = {
  currentValue: '0',
  previousValue: null,
  operation: null,
  waitingForOperand: false,
  error: false,
  expression: '',
};

/**
 * Calculator action types for the reducer
 */
export type CalculatorAction =
  | { type: 'INPUT_DIGIT'; payload: string }
  | { type: 'INPUT_DECIMAL' }
  | { type: 'INPUT_OPERATION'; payload: Operation }
  | { type: 'CALCULATE' }
  | { type: 'CLEAR' }
  | { type: 'TOGGLE_SIGN' }
  | { type: 'PERCENTAGE' }
  | { type: 'SET_ERROR' };

/**
 * Button types for the calculator UI
 */
export type ButtonType = 'number' | 'operator' | 'function' | 'equals';

/**
 * Button configuration
 */
export interface ButtonConfig {
  label: string;
  value: string;
  type: ButtonType;
  ariaLabel: string;
  className?: string;
  colSpan?: number;
}

/**
 * Keyboard event mapping
 */
export interface KeyMapping {
  key: string;
  action: () => void;
  description: string;
}