/**
 * Calculator Component
 *
 * Main calculator UI component with full functionality,
 * keyboard support, and accessibility features.
 * Uses CSS tokens for consistent theming.
 *
 * @module components/Calculator
 * @version 1.0.0
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import { useCalculator, useCalculatorKeyboard } from '../hooks/useCalculator';
import type { ButtonConfig, ButtonVariant, Operation } from '../types/Calculator';
import { parseOperation } from '../types/Calculator';
import './Calculator.css';

// ============================================================================
// BUTTON LAYOUT
// [V3.6] Added power (^) operator to layout
// ============================================================================

const BUTTON_LAYOUT: ButtonConfig[][] = [
  [
    { label: 'C', value: 'clear', type: 'function', ariaLabel: 'Clear all' },
    { label: '±', value: 'toggle-sign', type: 'function', ariaLabel: 'Toggle sign' },
    { label: '%', value: 'percentage', type: 'function', ariaLabel: 'Percentage' },
    { label: '÷', value: '÷', type: 'operator', ariaLabel: 'Divide' },
  ],
  [
    { label: '7', value: '7', type: 'number', ariaLabel: '7' },
    { label: '8', value: '8', type: 'number', ariaLabel: '8' },
    { label: '9', value: '9', type: 'number', ariaLabel: '9' },
    { label: '×', value: '×', type: 'operator', ariaLabel: 'Multiply' },
  ],
  [
    { label: '4', value: '4', type: 'number', ariaLabel: '4' },
    { label: '5', value: '5', type: 'number', ariaLabel: '5' },
    { label: '6', value: '6', type: 'number', ariaLabel: '6' },
    { label: '-', value: '-', type: 'operator', ariaLabel: 'Subtract' },
  ],
  [
    { label: '1', value: '1', type: 'number', ariaLabel: '1' },
    { label: '2', value: '2', type: 'number', ariaLabel: '2' },
    { label: '3', value: '3', type: 'number', ariaLabel: '3' },
    { label: '+', value: '+', type: 'operator', ariaLabel: 'Add' },
  ],
  [
    { label: '0', value: '0', type: 'zero', ariaLabel: '0', colSpan: 2 },
    { label: '.', value: '.', type: 'number', ariaLabel: 'Decimal point' },
    { label: '^', value: '^', type: 'operator', ariaLabel: 'Power' }, // [V3.6] Power operator
    { label: '=', value: '=', type: 'equals', ariaLabel: 'Calculate' },
  ],
];

// ============================================================================
// CALCULATOR BUTTON COMPONENT
// ============================================================================

interface CalculatorButtonProps {
  config: ButtonConfig;
  onClick: (value: string, type: ButtonVariant) => void;
  disabled?: boolean;
}

const CalculatorButton = memo<CalculatorButtonProps>(({ config, onClick, disabled = false }) => {
  const { label, value, type, ariaLabel, colSpan } = config;

  const handleClick = useCallback(() => {
    onClick(value, type);
  }, [onClick, value, type]);

  const className = useMemo(() => {
    const classes = ['calculator__button', `calculator__button--${type}`];
    if (colSpan) classes.push(`calculator__button--span-${colSpan}`);
    return classes.join(' ');
  }, [type, colSpan]);

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={false}
      data-testid={`calculator-button-${value.toLowerCase()}`}
    >
      <span className="calculator__button-label">{label}</span>
    </button>
  );
});

CalculatorButton.displayName = 'CalculatorButton';

// ============================================================================
// CALCULATOR DISPLAY COMPONENT
// ============================================================================

interface CalculatorDisplayProps {
  expression: string;
  displayValue: string;
  error: boolean;
}

const CalculatorDisplay = memo<CalculatorDisplayProps>(({ expression, displayValue, error }) => {
  const displayRef = useRef<HTMLDivElement>(null);

  return (
    <div className="calculator__display">
      <div
        ref={displayRef}
        className="calculator__expression"
        aria-live="polite"
        role="status"
        aria-atomic="true"
      >
        {expression}
      </div>
      <div
        className="calculator__value"
        aria-live="polite"
        role="status"
        aria-atomic="true"
      >
        {error ? 'Error' : displayValue}
      </div>
    </div>
  );
});

CalculatorDisplay.displayName = 'CalculatorDisplay';

// ============================================================================
// MAIN CALCULATOR COMPONENT
// ============================================================================

/**
 * Calculator Component
 *
 * Full-featured calculator with:
 * - Basic arithmetic operations
 * - Decimal support
 * - Percentage calculations
 * - Sign toggle
 * - Clear functionality
 * - Backspace support
 * - Keyboard input support
 * - Accessibility features
 */
export function Calculator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, displayValue, actions } = useCalculator();

  // Handle button clicks
  const handleButtonClick = useCallback(
    (value: string, type: ButtonVariant) => {
      switch (type) {
        case 'number':
          if (value === '.') {
            actions.inputDecimal();
          } else {
            actions.inputDigit(value);
          }
          break;
        case 'operator':
          actions.inputOperation(value as Operation);
          break;
        case 'function':
          if (value === 'clear') {
            actions.clear();
          } else if (value === 'toggle-sign') {
            actions.toggleSign();
          } else if (value === 'percentage') {
            actions.percentage();
          }
          break;
        case 'equals':
          actions.calculateResult();
          break;
        case 'zero':
          actions.inputDigit('0');
          break;
      }
    },
    [actions]
  );

  // Set up keyboard handling with backspace support
  useCalculatorKeyboard({
    onDigit: actions.inputDigit,
    onDecimal: actions.inputDecimal,
    onOperation: actions.inputOperation,
    onExponent: () => actions.inputOperation('^'), // [V3.6] Power operator
    onEquals: actions.calculateResult,
    onClear: actions.clear,
    onPercentage: actions.percentage,
    onToggleSign: actions.toggleSign,
    onBackspace: actions.backspace,
    containerRef,
  });

  // Memoize button grid
  const buttonGrid = useMemo(
    () =>
      BUTTON_LAYOUT.map((row, rowIndex) => (
        <div key={rowIndex} className="calculator__row">
          {row.map((buttonConfig) => (
            <CalculatorButton
              key={buttonConfig.value}
              config={buttonConfig}
              onClick={handleButtonClick}
              disabled={state.error && buttonConfig.value !== 'clear'}
            />
          ))}
        </div>
      )),
    [handleButtonClick, state.error]
  );

  return (
    <div
      ref={containerRef}
      className="calculator"
      role="application"
      aria-label="Calculator"
      tabIndex={0}
      data-testid="calculator"
    >
      <CalculatorDisplay
        expression={state.expression}
        displayValue={displayValue}
        error={state.error}
      />
      <div className="calculator__buttons">{buttonGrid}</div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { Calculator };
export default Calculator;
