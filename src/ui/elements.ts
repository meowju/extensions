/**
 * UI Elements Module
 * Button layout configuration, display area, and styling helpers
 */

/**
 * Button types for styling
 */
export type ButtonType = 'digit' | 'operator' | 'function' | 'memory' | 'clear';

/**
 * Button configuration
 */
export interface ButtonConfig {
  label: string;
  value: string;
  type: ButtonType;
  span?: number; // Grid column span
  ariaLabel?: string;
}

/**
 * Calculator button layout
 */
export const BUTTON_LAYOUT: ButtonConfig[][] = [
  // Row 1: Memory operations + Clear
  [
    { label: 'MC', value: 'MC', type: 'memory', ariaLabel: 'Memory Clear' },
    { label: 'MR', value: 'MR', type: 'memory', ariaLabel: 'Memory Recall' },
    { label: 'M+', value: 'M+', type: 'memory', ariaLabel: 'Memory Add' },
    { label: 'M−', value: 'M-', type: 'memory', ariaLabel: 'Memory Subtract' },
    { label: 'MS', value: 'MS', type: 'memory', ariaLabel: 'Memory Store' },
  ],
  // Row 2: Clear operations
  [
    { label: 'CE', value: 'CE', type: 'clear', ariaLabel: 'Clear Entry' },
    { label: 'AC', value: 'AC', type: 'clear', ariaLabel: 'All Clear' },
    { label: '⌫', value: 'BACKSPACE', type: 'function', ariaLabel: 'Backspace' },
    { label: '±', value: 'TOGGLE_SIGN', type: 'function', ariaLabel: 'Toggle Sign' },
  ],
  // Row 3: Operations row 1
  [
    { label: '(', value: '(', type: 'operator', ariaLabel: 'Open Parenthesis' },
    { label: ')', value: ')', type: 'operator', ariaLabel: 'Close Parenthesis' },
    { label: '%', value: '%', type: 'operator', ariaLabel: 'Percent' },
    { label: '÷', value: '/', type: 'operator', ariaLabel: 'Divide' },
  ],
  // Row 4: Digits + multiply
  [
    { label: '7', value: '7', type: 'digit' },
    { label: '8', value: '8', type: 'digit' },
    { label: '9', value: '9', type: 'digit' },
    { label: '×', value: '*', type: 'operator', ariaLabel: 'Multiply' },
  ],
  // Row 5: Digits + subtract
  [
    { label: '4', value: '4', type: 'digit' },
    { label: '5', value: '5', type: 'digit' },
    { label: '6', value: '6', type: 'digit' },
    { label: '−', value: '-', type: 'operator', ariaLabel: 'Subtract' },
  ],
  // Row 6: Digits + add
  [
    { label: '1', value: '1', type: 'digit' },
    { label: '2', value: '2', type: 'digit' },
    { label: '3', value: '3', type: 'digit' },
    { label: '+', value: '+', type: 'operator', ariaLabel: 'Add' },
  ],
  // Row 7: Zero + decimal + equals
  [
    { label: '0', value: '0', type: 'digit', span: 2 },
    { label: '.', value: '.', type: 'digit', ariaLabel: 'Decimal' },
    { label: '=', value: '=', type: 'operator', ariaLabel: 'Equals' },
  ],
];

/**
 * Get CSS class for button type
 */
export function getButtonClass(type: ButtonType): string {
  const classes: Record<ButtonType, string> = {
    digit: 'calc-btn--digit',
    operator: 'calc-btn--operator',
    function: 'calc-btn--function',
    memory: 'calc-btn--memory',
    clear: 'calc-btn--clear',
  };
  return classes[type];
}

/**
 * Create a button element
 */
export function createButton(config: ButtonConfig): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `calc-btn ${getButtonClass(config.type)}`;
  button.textContent = config.label;
  button.dataset.value = config.value;
  button.dataset.type = config.type;
  
  if (config.span) {
    button.style.gridColumn = `span ${config.span}`;
  }
  
  if (config.ariaLabel) {
    button.setAttribute('aria-label', config.ariaLabel);
  }
  
  return button;
}

/**
 * Create display element
 */
export function createDisplay(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'calc-display';
  
  const expression = document.createElement('div');
  expression.className = 'calc-display__expression';
  expression.id = 'calc-expression';
  expression.setAttribute('aria-live', 'polite');
  
  const result = document.createElement('div');
  result.className = 'calc-display__result';
  result.id = 'calc-result';
  result.textContent = '0';
  result.setAttribute('aria-live', 'polite');
  
  container.appendChild(expression);
  container.appendChild(result);
  
  return container;
}

/**
 * Create calculator container
 */
export function createCalculatorContainer(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'calc-container';
  container.setAttribute('role', 'application');
  container.setAttribute('aria-label', 'Calculator');
  return container;
}