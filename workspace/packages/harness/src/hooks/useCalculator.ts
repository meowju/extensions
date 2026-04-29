/**
 * useCalculator Hook
 * 
 * Custom hook for calculator state management using useReducer.
 */

import { useReducer, useCallback, useMemo } from 'react';
import type { CalculatorState, CalculatorAction, Operation } from '../types/Calculator';
import { INITIAL_STATE } from '../types/Calculator';
import { calculate, formatNumber, canAddDigit, canAddDecimal } from '../utils/calculator';

/**
 * Calculator reducer function
 */
function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
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

      // Check max digits
      if (!canAddDigit(state.currentValue)) {
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

    case 'INPUT_DECIMAL': {
      if (state.error) {
        return state;
      }

      // Can only add decimal once per number
      if (!canAddDecimal(state.currentValue)) {
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

    case 'INPUT_OPERATION': {
      const nextOperation = action.payload;

      // If there's a pending operation, calculate first
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

    case 'CALCULATE': {
      if (state.error || state.operation === null || state.previousValue === null) {
        return state;
      }

      const result = calculate(state.previousValue, state.currentValue, state.operation);

      if (result === null) {
        return {
          ...INITIAL_STATE,
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

    case 'CLEAR': {
      return INITIAL_STATE;
    }

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

    case 'SET_ERROR': {
      return {
        ...INITIAL_STATE,
        error: true,
      };
    }

    default:
      return state;
  }
}

/**
 * useCalculator hook
 * 
 * @returns Tuple of [state, action dispatchers]
 */
export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, INITIAL_STATE);

  // Memoized action dispatchers
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

  const setError = useCallback(() => {
    dispatch({ type: 'SET_ERROR' });
  }, []);

  // Memoized formatted display
  const displayValue = useMemo(() => {
    if (state.error) return 'Error';
    return formatNumber(state.currentValue);
  }, [state.error, state.currentValue]);

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
      setError,
    },
  };
}
