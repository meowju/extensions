/**
 * Calculator Component
 *
 * A sleek, retro-modern calculator component with comprehensive functionality.
 * Inspired by classic hardware calculators with contemporary polish.
 *
 * Features:
 * - Basic arithmetic operations (add, subtract, multiply, divide)
 * - Decimal support
 * - Percentage calculations
 * - Sign toggle (positive/negative)
 * - Clear functionality
 * - Chained operations
 * - Error handling for edge cases
 *
 * Best Practices Demonstrated:
 * - Custom hooks for calculator state management
 * - useReducer for complex state logic
 * - useMemo for derived values and calculations
 * - useCallback for stable event handlers
 * - Proper TypeScript typing with discriminated unions
 * - Comprehensive accessibility support
 * - CSS-in-JS styling with CSS custom properties
 * - Memoized child components to prevent unnecessary re-renders
 */

import React, {
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  KeyboardEvent,
  MouseEvent,
  memo,
} from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

type Operation = '+' | '-' | '×' | '÷' | null;

type CalculatorState = {
  currentValue: string;
  previousValue: string | null;
  operation: Operation;
  waitingForOperand: boolean;
  error: boolean;
  expression: string;
};

type CalculatorAction =
  | { type: 'INPUT_DIGIT'; payload: string }
  | { type: 'INPUT_DECIMAL' }
  | { type: 'INPUT_OPERATION'; payload: Operation }
  | { type: 'CALCULATE' }
  | { type: 'CLEAR' }
  | { type: 'TOGGLE_SIGN' }
  | { type: 'PERCENTAGE' }
  | { type: 'SET_ERROR' }
  | { type: 'BACKSPACE' };

interface CalculatorDisplayProps {
  currentValue: string;
  previousValue: string | null;
  operation: Operation;
  expression: string;
  error: boolean;
}

interface CalculatorButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'number' | 'operator' | 'function' | 'zero';
  disabled?: boolean;
  'aria-label'?: string;
}

interface CalculatorKeyboardHandlers {
  onDigit: (digit: string) => void;
  onDecimal: () => void;
  onOperation: (op: Operation) => void;
  onEquals: () => void;
  onClear: () => void;
  onToggleSign: () => void;
  onPercentage: () => void;
  onBackspace?: () => void;
  onExponent?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_DIGITS = 12;
const DISPLAY_MAX = 999999999999;
const DISPLAY_MIN = -999999999999;

const BUTTON_LAYOUT = [
  ['C', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
] as const;

const OPERATION_SYMBOLS: Operation[] = ['÷', '×', '-', '+'];

// ============================================================================
// Custom Hook: useCalculator
// ============================================================================

/**
 * Custom hook for managing calculator state using useReducer
 * Encapsulates all calculator business logic
 */
function useCalculator() {
  const initialState: CalculatorState = {
    currentValue: '0',
    previousValue: null,
    operation: null,
    waitingForOperand: false,
    error: false,
    expression: '',
  };

  const calculate = useCallback(
    (prev: number, current: number, op: NonNullable<Operation>): number | null => {
      switch (op) {
        case '+':
          return prev + current;
        case '-':
          return prev - current;
        case '×':
          return prev * current;
        case '÷':
          return current === 0 ? null : prev / current;
        default:
          return null;
      }
    },
    []
  );

  const formatResult = useCallback((value: number): string => {
    // Handle overflow
    if (Math.abs(value) > DISPLAY_MAX || (value !== 0 && Math.abs(value) < 1e-10)) {
      return 'Error';
    }

    // Format the number with appropriate precision
    const result = Math.round(value * 1e10) / 1e10;
    const stringValue = result.toString();

    // Check if we need scientific notation
    if (Math.abs(result) >= 1e12 || (Math.abs(result) < 1e-6 && result !== 0)) {
      return result.toExponential(6);
    }

    // Limit to max digits
    if (stringValue.replace('-', '').replace('.', '').length > MAX_DIGITS) {
      const precision = MAX_DIGITS - (stringValue.includes('.') ? 1 : 0);
      return result.toFixed(Math.max(0, precision));
    }

    return stringValue;
  }, []);

  const reducer = useCallback(
    (state: CalculatorState, action: CalculatorAction): CalculatorState => {
      // Reset error state on most actions
      if (action.type !== 'SET_ERROR' && state.error) {
        return { ...initialState };
      }

      switch (action.type) {
        case 'INPUT_DIGIT': {
          const digit = action.payload;

          if (state.waitingForOperand) {
            return {
              ...state,
              currentValue: digit === '0' ? '0' : digit,
              waitingForOperand: false,
            };
          }

          // Prevent multiple leading zeros
          if (state.currentValue === '0' && digit === '0') {
            return state;
          }

          // Replace leading zero with digit
          if (state.currentValue === '0' && digit !== '0') {
            return { ...state, currentValue: digit };
          }

          // Limit digits
          const digitsOnly = state.currentValue.replace('.', '');
          if (digitsOnly.length >= MAX_DIGITS) {
            return state;
          }

          return {
            ...state,
            currentValue: state.currentValue + digit,
          };
        }

        case 'INPUT_DECIMAL': {
          if (state.waitingForOperand) {
            return {
              ...state,
              currentValue: '0.',
              waitingForOperand: false,
            };
          }

          // Prevent multiple decimals
          if (state.currentValue.includes('.')) {
            return state;
          }

          return {
            ...state,
            currentValue: state.currentValue + '.',
          };
        }

        case 'INPUT_OPERATION': {
          const op = action.payload;

          // If we have a pending operation, calculate first
          if (state.previousValue !== null && state.operation !== null) {
            const prev = parseFloat(state.previousValue);
            const current = parseFloat(state.currentValue);
            const result = calculate(prev, current, state.operation);

            if (result === null) {
              return { ...initialState, error: true };
            }

            const formattedResult = formatResult(result);
            if (formattedResult === 'Error') {
              return { ...initialState, error: true };
            }

            return {
              previousValue: formattedResult,
              operation: op,
              currentValue: formattedResult,
              waitingForOperand: true,
              error: false,
              expression: `${formattedResult} ${op}`,
            };
          }

          return {
            ...state,
            previousValue: state.currentValue,
            operation: op,
            waitingForOperand: true,
            expression: `${state.currentValue} ${op}`,
          };
        }

        case 'CALCULATE': {
          if (state.operation === null || state.previousValue === null) {
            return state;
          }

          const prev = parseFloat(state.previousValue);
          const current = parseFloat(state.currentValue);
          const result = calculate(prev, current, state.operation);

          if (result === null) {
            return { ...initialState, error: true };
          }

          const formattedResult = formatResult(result);
          if (formattedResult === 'Error') {
            return { ...initialState, error: true };
          }

          return {
            previousValue: null,
            operation: null,
            currentValue: formattedResult,
            waitingForOperand: true,
            error: false,
            expression: `${state.previousValue} ${state.operation} ${state.currentValue} =`,
          };
        }

        case 'CLEAR': {
          return initialState;
        }

        case 'TOGGLE_SIGN': {
          if (state.currentValue === '0') {
            return state;
          }

          const negated =
            state.currentValue.startsWith('-')
              ? state.currentValue.slice(1)
              : '-' + state.currentValue;

          return { ...state, currentValue: negated };
        }

        case 'PERCENTAGE': {
          const value = parseFloat(state.currentValue);
          const result = value / 100;
          const formatted = formatResult(result);

          return {
            ...state,
            currentValue: formatted,
            expression: `${state.currentValue}%`,
          };
        }

        case 'SET_ERROR': {
          return { ...initialState, error: true };
        }

        case 'BACKSPACE': {
          // Don't allow backspace on zero or errors
          if (state.currentValue === '0' || state.error) {
            return state;
          }

          // If waiting for operand, backspace is disabled
          if (state.waitingForOperand) {
            return state;
          }

          // Remove last character
          const newValue = state.currentValue.length === 1
            ? '0'
            : state.currentValue.slice(0, -1);

          // Handle case where we delete the negative sign
          if (newValue === '' || newValue === '-') {
            return { ...state, currentValue: '0' };
          }

          return { ...state, currentValue: newValue };
        }

        default:
          return state;
      }
    },
    [calculate, formatResult, initialState]
  );

  const [state, dispatch] = useReducer(reducer, initialState);

  // Expose actions as memoized callbacks
  const actions = useMemo(
    () => ({
      inputDigit: (digit: string) => dispatch({ type: 'INPUT_DIGIT', payload: digit }),
      inputDecimal: () => dispatch({ type: 'INPUT_DECIMAL' }),
      inputOperation: (op: Operation) => dispatch({ type: 'INPUT_OPERATION', payload: op }),
      calculate: () => dispatch({ type: 'CALCULATE' }),
      clear: () => dispatch({ type: 'CLEAR' }),
      toggleSign: () => dispatch({ type: 'TOGGLE_SIGN' }),
      percentage: () => dispatch({ type: 'PERCENTAGE' }),
      backspace: () => dispatch({ type: 'BACKSPACE' }),
      exponent: () => dispatch({ type: 'INPUT_OPERATION', payload: '^' }),
    }),
    []
  );

  return { state, actions };
}

// ============================================================================
// Custom Hook: useCalculatorKeyboard
// ============================================================================

/**
 * Handles keyboard input for the calculator
 */
function useCalculatorKeyboard(handlers: CalculatorKeyboardHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;

      // Numbers
      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        handlers.onDigit(key);
        return;
      }

      // Decimal
      if (key === '.') {
        event.preventDefault();
        handlers.onDecimal();
        return;
      }

      // Backspace - delete last digit
      if (key === 'Backspace') {
        event.preventDefault();
        handlers.onBackspace?.();
        return;
      }

      // Exponent/power operator (^)
      if (key === '^') {
        event.preventDefault();
        handlers.onExponent?.();
        return;
      }

      // Operations
      switch (key) {
        case '+':
          event.preventDefault();
          handlers.onOperation('+');
          break;
        case '-':
          event.preventDefault();
          handlers.onOperation('-');
          break;
        case '*':
          event.preventDefault();
          handlers.onOperation('×');
          break;
        case '/':
          event.preventDefault();
          handlers.onOperation('÷');
          break;
        case 'Enter':
        case '=':
          event.preventDefault();
          handlers.onEquals();
          break;
        case 'Escape':
        case 'c':
        case 'C':
          event.preventDefault();
          handlers.onClear();
          break;
        case '%':
          event.preventDefault();
          handlers.onPercentage();
          break;
      }
    },
    [handlers]
  );

  return { handleKeyDown };
}

// ============================================================================
// Sub-components: Display
// ============================================================================

const CalculatorDisplay = memo<CalculatorDisplayProps>(
  ({ currentValue, previousValue, operation, expression, error }) => {
    const displayRef = useRef<HTMLDivElement>(null);

    // Scroll to end when value changes
    useEffect(() => {
      if (displayRef.current) {
        displayRef.current.scrollLeft = displayRef.current.scrollWidth;
      }
    }, [currentValue]);

    const displayValue = useMemo(() => {
      if (error) return 'Error';
      return currentValue;
    }, [currentValue, error]);

    return (
      <div className="calculator__display" data-testid="calculator-display">
        <div
          className="calculator__expression"
          data-testid="calculator-expression"
          aria-live="polite"
          aria-atomic="true"
        >
          {expression || (previousValue ? `${previousValue} ${operation}` : '')}
        </div>
        <div
          ref={displayRef}
          className="calculator__value"
          data-testid="calculator-value"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {displayValue}
        </div>
      </div>
    );
  }
);

CalculatorDisplay.displayName = 'CalculatorDisplay';

// ============================================================================
// Sub-component: Button
// ============================================================================

const CalculatorButton = memo<CalculatorButtonProps>(
  ({ label, onClick, variant = 'number', disabled = false, 'aria-label': ariaLabel }) => {
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        if (!disabled) {
          onClick();
        }
      },
      [onClick, disabled]
    );

    const variantClass = `calculator__button--${variant}`;

    return (
      <button
        ref={buttonRef}
        type="button"
        className={`calculator__button ${variantClass}`}
        onClick={handleClick}
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-pressed={false}
        data-testid={`calculator-button-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
      >
        <span className="calculator__button-label">{label}</span>
      </button>
    );
  }
);

CalculatorButton.displayName = 'CalculatorButton';

// ============================================================================
// Main Component: Calculator
// ============================================================================

/**
 * A sleek, retro-modern calculator component with comprehensive functionality
 */
function CalculatorComponent() {
  const { state, actions } = useCalculator();
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Create keyboard handlers
  const keyboardHandlers = useMemo<CalculatorKeyboardHandlers>(
    () => ({
      onDigit: actions.inputDigit,
      onDecimal: actions.inputDecimal,
      onOperation: actions.inputOperation,
      onEquals: actions.calculate,
      onClear: actions.clear,
      onToggleSign: actions.toggleSign,
      onPercentage: actions.percentage,
      onBackspace: actions.backspace,
      onExponent: actions.exponent,
    }),
    [actions]
  );

  const { handleKeyDown } = useCalculatorKeyboard(keyboardHandlers);

  // Memoize button handlers to prevent re-renders
  const handleButtonClick = useCallback(
    (value: string) => {
      if (/^[0-9]$/.test(value)) {
        actions.inputDigit(value);
      } else if (value === '.') {
        actions.inputDecimal();
      } else if (OPERATION_SYMBOLS.includes(value as Operation)) {
        actions.inputOperation(value as Operation);
      } else if (value === '=') {
        actions.calculate();
      } else if (value === 'C') {
        actions.clear();
      } else if (value === '±') {
        actions.toggleSign();
      } else if (value === '%') {
        actions.percentage();
      }
    },
    [actions]
  );

  // Determine button variant
  const getButtonVariant = useCallback(
    (label: string): CalculatorButtonProps['variant'] => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(label)) {
        return 'number';
      }
      if (label === '.') {
        return 'number';
      }
      if (['+', '-', '×', '÷', '='].includes(label)) {
        return label === '=' ? 'function' : 'operator';
      }
      return 'function';
    },
    []
  );

  // Memoize the button grid
  const buttonGrid = useMemo(() => {
    return BUTTON_LAYOUT.map((row, rowIndex) => (
      <div key={rowIndex} className="calculator__row">
        {row.map((button, colIndex) => {
          const isZero = button === '0';
          const variant = getButtonVariant(button);

          return (
            <div
              key={colIndex}
              className={`calculator__cell ${isZero ? 'calculator__cell--zero' : ''}`}
            >
              <CalculatorButton
                label={button}
                onClick={() => handleButtonClick(button)}
                variant={variant}
                disabled={state.error && button !== 'C'}
                aria-label={
                  button === '±'
                    ? 'Toggle sign'
                    : button === '%'
                      ? 'Calculate percentage'
                      : button === '÷'
                        ? 'Divide'
                        : button === '×'
                          ? 'Multiply'
                          : undefined
                }
              />
            </div>
          );
        })}
      </div>
    ));
  }, [getButtonVariant, handleButtonClick, state.error]);

  return (
    <div
      ref={calculatorRef}
      className="calculator"
      role="application"
      aria-label="Calculator"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-testid="calculator"
    >
      <CalculatorDisplay
        currentValue={state.currentValue}
        previousValue={state.previousValue}
        operation={state.operation}
        expression={state.expression}
        error={state.error}
      />
      <div className="calculator__buttons">{buttonGrid}</div>
    </div>
  );
}

// ============================================================================
// Component Styles (CSS-in-JS for portability)
// ============================================================================

const styles = `
  .calculator {
    --calc-bg: #1a1a2e;
    --calc-display-bg: #16213e;
    --calc-number-bg: #0f3460;
    --calc-number-hover: #1a4a7a;
    --calc-operator-bg: #e94560;
    --calc-operator-hover: #ff6b6b;
    --calc-function-bg: #f5a623;
    --calc-function-hover: #ffb84d;
    --calc-text-primary: #ffffff;
    --calc-text-secondary: #a0a0a0;
    --calc-display-text: #00ff88;

    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--calc-bg);
    border-radius: 12px;
    padding: 16px;
    max-width: 320px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    outline: none;
  }

  .calculator:focus-visible {
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 2px var(--calc-display-text);
  }

  .calculator__display {
    background: var(--calc-display-bg);
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 16px;
    min-height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-end;
    overflow: hidden;
  }

  .calculator__expression {
    font-family: 'Orbitron', 'Roboto Mono', monospace;
    font-size: 0.875rem;
    color: var(--calc-text-secondary);
    margin-bottom: 8px;
    min-height: 1.25rem;
    text-align: right;
    width: 100%;
  }

  .calculator__value {
    font-family: 'Orbitron', 'Roboto Mono', monospace;
    font-size: 2.5rem;
    color: var(--calc-display-text);
    text-align: right;
    width: 100%;
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: none;
  }

  .calculator__value::-webkit-scrollbar {
    display: none;
  }

  .calculator__buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .calculator__row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .calculator__cell {
    display: contents;
  }

  .calculator__cell--zero {
    grid-column: span 2;
  }

  .calculator__cell--zero .calculator__button {
    width: 100%;
  }

  .calculator__button {
    font-family: 'Inter', sans-serif;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--calc-text-primary);
    background: var(--calc-number-bg);
    border: none;
    border-radius: 8px;
    padding: 20px;
    cursor: pointer;
    transition: background-color 150ms ease, transform 100ms ease-out, box-shadow 150ms ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .calculator__button:hover:not(:disabled) {
    background: var(--calc-number-hover);
  }

  .calculator__button:active:not(:disabled) {
    transform: scale(0.95);
    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .calculator__button:focus-visible {
    outline: 2px solid var(--calc-display-text);
    outline-offset: 2px;
  }

  .calculator__button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .calculator__button--operator {
    background: var(--calc-operator-bg);
  }

  .calculator__button--operator:hover:not(:disabled) {
    background: var(--calc-operator-hover);
  }

  .calculator__button--function {
    background: var(--calc-function-bg);
    color: #1a1a2e;
  }

  .calculator__button--function:hover:not(:disabled) {
    background: var(--calc-function-hover);
  }

  .calculator__button-label {
    line-height: 1;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

// Named export with default styles injection
const Calculator = Object.assign(CalculatorComponent, {
  Display: CalculatorDisplay,
  Button: CalculatorButton,
});

export { Calculator, CalculatorDisplay, CalculatorButton };
export type {
  CalculatorState,
  CalculatorAction,
  CalculatorDisplayProps,
  CalculatorButtonProps,
  CalculatorKeyboardHandlers,
  Operation,
};
