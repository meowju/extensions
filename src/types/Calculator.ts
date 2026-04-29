/**
 * Calculator Types
 *
 * Type definitions for the precision calculator.
 * Single source of truth for all calculator-related types.
 *
 * @module types/Calculator
 * @version 1.0.0
 */

// ============================================================================
// OPERATION TYPES
// ============================================================================

/** Supported arithmetic operations [V3.6] Added power operator (^) */
export type Operation = '+' | '-' | '×' | '÷' | '^';

/** Operation symbols mapping */
export const OPERATION_SYMBOLS: Record<Operation, string> = {
  '+': '+',
  '-': '-',
  '×': '×',
  '÷': '÷',
  '^': '^', // [V3.6] Power operator
};

/** Parse operation from string [V3.6] Added power operator support */
export function parseOperation(symbol: string): Operation | null {
  switch (symbol) {
    case '+':
    case '-':
    case '×':
    case '*':
    case '÷':
    case '/':
    case '^':
      if (symbol === '*') return '×';
      if (symbol === '/') return '÷';
      return symbol as Operation;
    default:
      return null;
  }
}

// ============================================================================
// STATE TYPES
// ============================================================================

/** Calculator state interface */
export interface CalculatorState {
  currentValue: string;
  previousValue: string | null;
  operation: Operation | null;
  waitingForOperand: boolean;
  error: boolean;
  expression: string;
  memory: number;
}

/** Initial calculator state */
export const INITIAL_STATE: CalculatorState = {
  currentValue: '0',
  previousValue: null,
  operation: null,
  waitingForOperand: false,
  error: false,
  expression: '',
  memory: 0,
};

// ============================================================================
// ACTION TYPES
// ============================================================================

/** Calculator action types */
export type CalculatorAction =
  | { type: 'INPUT_DIGIT'; payload: string }
  | { type: 'INPUT_DECIMAL' }
  | { type: 'INPUT_OPERATION'; payload: Operation }
  | { type: 'CALCULATE' }
  | { type: 'CLEAR' }
  | { type: 'TOGGLE_SIGN' }
  | { type: 'PERCENTAGE' }
  | { type: 'BACKSPACE' }
  | { type: 'SET_ERROR' };

// ============================================================================
// DISPLAY TYPES
// ============================================================================

/** Calculator display props */
export interface CalculatorDisplayProps {
  currentValue: string;
  previousValue: string | null;
  operation: Operation | null;
  expression: string;
  error: boolean;
}

// ============================================================================
// BUTTON TYPES
// ============================================================================

/** Button variant types */
export type ButtonVariant = 'number' | 'operator' | 'function' | 'equals' | 'zero';

/** Calculator button configuration */
export interface ButtonConfig {
  label: string;
  value: string;
  type: ButtonVariant;
  ariaLabel: string;
  colSpan?: number;
}

/** Button layout row type */
export type ButtonLayout = readonly (readonly ButtonConfig[])[];

/** Calculator button props */
export interface CalculatorButtonProps {
  config: ButtonConfig;
  onClick: (value: string, type: ButtonVariant) => void;
  disabled?: boolean;
}

// ============================================================================
// KEYBOARD HANDLER TYPES
// ============================================================================

/** Keyboard handler interface */
export interface KeyboardHandlers {
  onDigit: (digit: string) => void;
  onDecimal: () => void;
  onOperation: (op: Operation) => void;
  onEquals: () => void;
  onClear: () => void;
  onToggleSign: () => void;
  onPercentage: () => void;
  onBackspace?: () => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Calculation result type */
export type CalculationResult =
  | { success: true; value: number }
  | { success: false; error: string };

/** Number limits */
export const MAX_DIGITS = 12;
export const MAX_VALUE = 999999999999;
export const MIN_VALUE = -999999999999;
