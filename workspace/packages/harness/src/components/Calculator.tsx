/**
 * Calculator Component
 * 
 * Main calculator UI component with full functionality,
 * keyboard support, and accessibility features.
 */

import React, { memo, useRef, useCallback, useMemo } from 'react';
import { useCalculator } from '../hooks/useCalculator';
import { useCalculatorKeyboard } from '../hooks/useCalculatorKeyboard';
import type { ButtonConfig, ButtonType } from '../types/Calculator';

// Button layout configuration
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
    { label: '0', value: '0', type: 'number', ariaLabel: '0', colSpan: 2 },
    { label: '.', value: '.', type: 'number', ariaLabel: 'Decimal point' },
    { label: '=', value: '=', type: 'equals', ariaLabel: 'Calculate' },
  ],
];

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    maxWidth: '320px',
    margin: '0 auto',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
  },
  display: {
    backgroundColor: '#16213e',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
  },
  expression: {
    fontFamily: "'Orbitron', 'Roboto Mono', monospace",
    fontSize: '0.875rem',
    color: '#a0a0a0',
    minHeight: '1.25rem',
    marginBottom: '8px',
    textAlign: 'right' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  value: {
    fontFamily: "'Orbitron', 'Roboto Mono', monospace",
    fontSize: '2.5rem',
    color: '#00ff88',
    textAlign: 'right' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  button: {
    height: '60px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1.5rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', sans-serif",
  },
  numberButton: {
    backgroundColor: '#0f3460',
    color: '#ffffff',
  },
  operatorButton: {
    backgroundColor: '#e94560',
    color: '#ffffff',
  },
  functionButton: {
    backgroundColor: '#f5a623',
    color: '#ffffff',
  },
  equalsButton: {
    backgroundColor: '#e94560',
    color: '#ffffff',
  },
};

// Memoized button component
interface CalculatorButtonProps {
  config: ButtonConfig;
  onClick: (value: string, type: ButtonType) => void;
  disabled?: boolean;
}

const CalculatorButton = memo(function CalculatorButton({
  config,
  onClick,
  disabled = false,
}: CalculatorButtonProps) {
  const { label, value, type, ariaLabel, colSpan } = config;

  const getButtonStyle = (): React.CSSProperties => {
    const baseStyle = { ...styles.button };
    
    if (colSpan) {
      baseStyle.gridColumn = `span ${colSpan}`;
    }

    switch (type) {
      case 'number':
        return { ...baseStyle, ...styles.numberButton };
      case 'operator':
        return { ...baseStyle, ...styles.operatorButton };
      case 'function':
        return { ...baseStyle, ...styles.functionButton };
      case 'equals':
        return { ...baseStyle, ...styles.equalsButton };
      default:
        return baseStyle;
    }
  };

  const handleClick = useCallback(() => {
    onClick(value, type);
  }, [onClick, value, type]);

  return (
    <button
      type="button"
      style={getButtonStyle()}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={false}
    >
      {label}
    </button>
  );
});

/**
 * Calculator Component
 */
export function Calculator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, displayValue, actions } = useCalculator();

  // Handle button clicks
  const handleButtonClick = useCallback((value: string, type: ButtonType) => {
    switch (type) {
      case 'number':
        if (value === '.') {
          actions.inputDecimal();
        } else {
          actions.inputDigit(value);
        }
        break;
      case 'operator':
        actions.inputOperation(value as '+' | '-' | '×' | '÷');
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
    }
  }, [actions]);

  // Set up keyboard handling
  useCalculatorKeyboard({
    onDigit: actions.inputDigit,
    onDecimal: actions.inputDecimal,
    onOperation: actions.inputOperation,
    onEquals: actions.calculateResult,
    onClear: actions.clear,
    onPercentage: actions.percentage,
    onToggleSign: actions.toggleSign,
    containerRef,
  });

  // Memoize button grid
  const buttonGrid = useMemo(
    () =>
      BUTTON_LAYOUT.map((row, rowIndex) => (
        <div key={rowIndex} style={styles.buttonGrid}>
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
      role="application"
      aria-label="Calculator"
      tabIndex={0}
      style={styles.container}
    >
      <div style={styles.display}>
        <div
          style={styles.expression}
          aria-live="polite"
          role="status"
        >
          {state.expression}
        </div>
        <div
          style={styles.value}
          aria-live="polite"
          role="status"
          aria-atomic="true"
        >
          {displayValue}
        </div>
      </div>
      {buttonGrid}
    </div>
  );
}

export default Calculator;
