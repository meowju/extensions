/**
 * useCalculator Hook
 *
 * Custom hook for calculator state management using useReducer.
 * Single source of truth for all calculator state logic.
 * [V3.6] Unified from multiple implementations.
 *
 * @module hooks/useCalculator
 * @version 3.6.0
 * @unified-source true
 */

import { useReducer, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Operation, CalculatorState } from '../types/Calculator';
import { INITIAL_STATE } from '../types/Calculator';
import { calculate, formatNumber, performOperation } from '../utils/calculator';

// ============================================================================
// CALCULATOR TYPES
// ============================================================================

// Redundant types removed - imported from ../types/Calculator

export type CalculatorAction =
  | { type: 'INPUT_DIGIT'; payload: string }
  | { type: 'INPUT_DECIMAL' }
  | { type: 'INPUT_OPERATION'; payload: Operation }
  | { type: 'CALCULATE' }
  | { type: 'CLEAR' }
  | { type: 'TOGGLE_SIGN' }
  | { type: 'PERCENTAGE' }
  | { type: 'BACKSPACE' }
  | { type: 'SET_ERROR' }
  | { type: 'MEMORY_ADD' }
  | { type: 'MEMORY_SUBTRACT' }
  | { type: 'MEMORY_RECALL' }
  | { type: 'MEMORY_CLEAR' };

export interface KeyboardHandlers {
  onDigit: (digit: string) => void;
  onDecimal: () => void;
  onOperation: (op: Operation) => void;
  onExponent?: () => void;
  onEquals: () => void;
  onClear: () => void;
  onPercentage: () => void;
  onToggleSign: () => void;
  onBackspace?: () => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

// ============================================================================
// REDUCER
// ============================================================================

/**
 * Calculator reducer function
 * [V3.6] Unified reducer with proper operator precedence handling
 */
function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    // -------------------------------------------------------------------------
    // Digit Input
    // -------------------------------------------------------------------------
    case 'INPUT_DIGIT': {
      if (state.error) {
        return state;
      }

      const digit = action.payload;

      // Handle initial zero replacement
      if (state.currentValue === '0' && digit !== '0') {
        return {
          ...state,
          currentValue: digit,
          waitingForOperand: false,
        };
      }

      // Prevent multiple leading zeros
      if (state.currentValue === '0' && digit === '0') {
        return state;
      }

      // Check max digits (12)
      const digitCount = state.currentValue.replace(/[^0-9]/g, '').length;
      if (digitCount >= 12) {
        return state;
      }

      // If waiting for new operand, start fresh
      if (state.waitingForOperand) {
        return {
          ...state,
          currentValue: digit,
          waitingForOperand: false,
        };
      }

      // Append digit
      const newValue = state.currentValue + digit;

      // Validate final length
      if (newValue.replace('.', '').replace('-', '').length > 12) {
        return state;
      }

      return {
        ...state,
        currentValue: newValue,
      };
    }

    // -------------------------------------------------------------------------
    // Decimal Input
    // -------------------------------------------------------------------------
    case 'INPUT_DECIMAL': {
      if (state.error) {
        return state;
      }

      // Can only add decimal once per number
      if (state.currentValue.includes('.')) {
        return state;
      }

      // If waiting for operand, start with "0."
      if (state.waitingForOperand) {
        return {
          ...state,
          currentValue: '0.',
          waitingForOperand: false,
        };
      }

      // Add decimal to current value
      return {
        ...state,
        currentValue: state.currentValue + '.',
      };
    }

    // -------------------------------------------------------------------------
    // Operation Input
    // [V3.6] Fixed: Proper operator precedence handling
    // -------------------------------------------------------------------------
    case 'INPUT_OPERATION': {
      const nextOperation = action.payload;

      // If there's a pending operation, calculate first (chaining)
      if (state.previousValue !== null && state.operation !== null && !state.waitingForOperand) {
        const result = calculate(state.previousValue, state.currentValue, state.operation);

        if (result === null) {
          return {
            ...INITIAL_STATE,
            error: true,
          };
        }

        const expression = `${formatNumber(result)} ${nextOperation}`;

        return {
          ...state,
          previousValue: result,
          operation: nextOperation,
          currentValue: result,
          waitingForOperand: true,
          expression,
        };
      }

      // Start new operation
      return {
        ...state,
        previousValue: state.currentValue,
        operation: nextOperation,
        waitingForOperand: true,
        expression: `${formatNumber(state.currentValue)} ${nextOperation}`,
      };
    }

    // -------------------------------------------------------------------------
    // Calculate / Equals
    // -------------------------------------------------------------------------
    case 'CALCULATE': {
      if (state.error || state.operation === null || state.previousValue === null) {
        return state;
      }

      const result = calculate(state.previousValue, state.currentValue, state.operation);

      if (result === null) {
        return {
          ...INITIAL_STATE,
          memory: state.memory,
          error: true,
        };
      }

      const fullExpression = `${formatNumber(state.previousValue)} ${state.operation} ${formatNumber(state.currentValue)} =`;

      return {
        ...state,
        currentValue: result,
        previousValue: null,
        operation: null,
        waitingForOperand: true,
        expression: fullExpression,
      };
    }

    // -------------------------------------------------------------------------
    // Clear
    // -------------------------------------------------------------------------
    case 'CLEAR': {
      return INITIAL_STATE;
    }

    // -------------------------------------------------------------------------
    // Toggle Sign (+/-)
    // -------------------------------------------------------------------------
    case 'TOGGLE_SIGN': {
      if (state.error || state.currentValue === '0') {
        return state;
      }

      const num = parseFloat(state.currentValue);
      const toggled = (num * -1).toString();

      return {
        ...state,
        currentValue: toggled,
      };
    }

    // -------------------------------------------------------------------------
    // Percentage
    // -------------------------------------------------------------------------
    case 'PERCENTAGE': {
      if (state.error) {
        return state;
      }

      // If there's a pending operation, apply percentage to current value
      if (state.previousValue !== null && state.operation !== null) {
        const percentageValue = parseFloat(state.currentValue) / 100;
        const result = calculate(state.previousValue, percentageValue.toString(), state.operation);

        if (result === null) {
          return {
            ...INITIAL_STATE,
            error: true,
          };
        }

        return {
          ...state,
          currentValue: result,
          previousValue: null,
          operation: null,
          waitingForOperand: true,
          expression: '',
        };
      }

      // Standalone percentage
      const percentageValue = parseFloat(state.currentValue) / 100;

      return {
        ...state,
        currentValue: percentageValue.toString(),
      };
    }

    // -------------------------------------------------------------------------
    // Backspace
    // [V3.6] Fixed: Properly handles negative numbers and single-digit values
    // -------------------------------------------------------------------------
    case 'BACKSPACE': {
      if (state.error || state.waitingForOperand) {
        return state;
      }

      const current = state.currentValue;

      // If only one character or negative single digit, reset to "0"
      if (current.length === 1 || (current.length === 2 && current.startsWith('-'))) {
        return {
          ...state,
          currentValue: '0',
        };
      }

      // Remove last character
      return {
        ...state,
        currentValue: current.slice(0, -1),
      };
    }

    // -------------------------------------------------------------------------
    // Set Error
    // -------------------------------------------------------------------------
    case 'SET_ERROR': {
      return {
        ...INITIAL_STATE,
        error: true,
      };
    }

    // -------------------------------------------------------------------------
    // Memory Operations
    // -------------------------------------------------------------------------
    case 'MEMORY_ADD': {
      const value = parseFloat(state.currentValue);
      if (!isNaN(value)) {
        return {
          ...state,
          memory: state.memory + value,
        };
      }
      return state;
    }

    case 'MEMORY_SUBTRACT': {
      const value = parseFloat(state.currentValue);
      if (!isNaN(value)) {
        return {
          ...state,
          memory: state.memory - value,
        };
      }
      return state;
    }

    case 'MEMORY_RECALL': {
      return {
        ...state,
        currentValue: state.memory.toString(),
        waitingForOperand: true,
      };
    }

    case 'MEMORY_CLEAR': {
      return {
        ...state,
        memory: 0,
      };
    }

    // -------------------------------------------------------------------------
    // Default
    // -------------------------------------------------------------------------
    default:
      return state;
  }
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useCalculator hook
 * 
 * [V3.6] Returns proper state and displayValue for React components.
 *
 * @returns { state, displayValue, actions }
 */
export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, {
    ...INITIAL_STATE,
    memory: 0,
  });

  // ---------------------------------------------------------------------------
  // Action Dispatchers
  // ---------------------------------------------------------------------------

  const inputDigit = useCallback((digit: string) => {
    dispatch({ type: 'INPUT_DIGIT', payload: digit });
  }, []);

  const inputDecimal = useCallback(() => {
    dispatch({ type: 'INPUT_DECIMAL' });
  }, []);

  const inputOperation = useCallback((operation: Operation) => {
    dispatch({ type: 'INPUT_OPERATION', payload: operation });
  }, []);

  const calculateResult = useCallback(() => {
    dispatch({ type: 'CALCULATE' });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const toggleSign = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIGN' });
  }, []);

  const percentage = useCallback(() => {
    dispatch({ type: 'PERCENTAGE' });
  }, []);

  const backspace = useCallback(() => {
    dispatch({ type: 'BACKSPACE' });
  }, []);

  const setError = useCallback(() => {
    dispatch({ type: 'SET_ERROR' });
  }, []);

  const memoryAdd = useCallback(() => {
    dispatch({ type: 'MEMORY_ADD' });
  }, []);

  const memorySubtract = useCallback(() => {
    dispatch({ type: 'MEMORY_SUBTRACT' });
  }, []);

  const memoryRecall = useCallback(() => {
    dispatch({ type: 'MEMORY_RECALL' });
  }, []);

  const memoryClear = useCallback(() => {
    dispatch({ type: 'MEMORY_CLEAR' });
  }, []);

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  /** [V3.6] Fixed: displayValue must be a string */
  const displayValue = useMemo(() => {
    if (state.error) return 'Error';
    return formatNumber(state.currentValue);
  }, [state.error, state.currentValue]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    state,
    displayValue,
    actions: {
      inputDigit,
      inputDecimal,
      inputOperation,
      calculateResult,
      clear,
      toggleSign,
      percentage,
      backspace,
      setError,
      memoryAdd,
      memorySubtract,
      memoryRecall,
      memoryClear,
    },
  };
}

// ============================================================================
// KEYBOARD HOOK
// ============================================================================

/**
 * useCalculatorKeyboard hook
 * 
 * Handles keyboard input for the calculator.
 * [V3.6] Fixed: Added Backspace and ^ (power) support.
 *
 * @param handlers - Keyboard handler callbacks
 */
export function useCalculatorKeyboard(handlers: KeyboardHandlers) {
  const handlersRef = useRef(handlers);

  // Update ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key } = event;

    // Number keys (0-9)
    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      handlersRef.current.onDigit(key);
      return;
    }

    // Decimal point
    if (key === '.') {
      event.preventDefault();
      handlersRef.current.onDecimal();
      return;
    }

    // [V3.6] Backspace - Delete last digit
    if (key === 'Backspace') {
      event.preventDefault();
      handlersRef.current.onBackspace?.();
      return;
    }

    // [V3.6] Power operator (^)
    if (key === '^') {
      event.preventDefault();
      // Use exponent handler if available, otherwise treat as multiply
      if (handlersRef.current.onExponent) {
        handlersRef.current.onExponent();
      }
      return;
    }

    // Operators
    switch (key) {
      case '+':
        event.preventDefault();
        handlersRef.current.onOperation('+');
        break;
      case '-':
        event.preventDefault();
        handlersRef.current.onOperation('-');
        break;
      case '*':
        event.preventDefault();
        handlersRef.current.onOperation('×');
        break;
      case '/':
        event.preventDefault();
        if (!event.shiftKey) {
          handlersRef.current.onOperation('÷');
        }
        break;
      case '%':
        event.preventDefault();
        handlersRef.current.onPercentage();
        break;
      case '=':
      case 'Enter':
        event.preventDefault();
        handlersRef.current.onEquals();
        break;
      case 'Escape':
      case 'c':
      case 'C':
        event.preventDefault();
        handlersRef.current.onClear();
        break;
    }
  }, []);

  // Attach/detach keyboard listener
  useEffect(() => {
    const target = handlers.containerRef?.current ?? document;
    target.addEventListener('keydown', handleKeyDown as EventListener);
    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [handleKeyDown, handlers.containerRef]);
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { Operation } from '../types/Calculator';
export { INITIAL_STATE } from '../types/Calculator';