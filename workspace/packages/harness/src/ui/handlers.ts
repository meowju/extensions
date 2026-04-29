/**
 * Event Handlers Module
 * Handles button clicks and keyboard input for calculator
 */

import { Calculator } from '../calculator/calculator';

/**
 * Map of button values to handler functions
 */
type ButtonHandler = (calculator: Calculator) => void;

/**
 * Error callback type
 */
type ErrorCallback = (error: string) => void;

/**
 * Keyboard mapping type
 */
type KeyboardMapping = Record<string, string>;

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Default keyboard mapping
 */
const DEFAULT_KEYBOARD_MAPPING: KeyboardMapping = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '.': '.',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '^': '^',
  'Enter': '=',
  '=': '=',
  'Backspace': 'BACKSPACE',
  'Delete': 'CE',
  'Escape': 'AC',
  'c': 'CE',
  'C': 'CE',
  '(': '(',
  ')': ')',
  '%': '%',
};

/**
 * Get button handler based on button value
 */
function getButtonHandler(value: string): ButtonHandler {
  // Digit handlers
  if (DIGITS.includes(value)) {
    return (calc) => calc.digit(value);
  }

  // Decimal handler
  if (value === '.') {
    return (calc) => calc.decimal();
  }

  // Operator handlers
  if (['+', '-', '*', '/', '^'].includes(value)) {
    return (calc) => calc.operator(value);
  }

  // Equals handler
  if (value === '=') {
    return (calc) => calc.equals();
  }

  // Clear handlers
  if (value === 'CE') {
    return (calc) => calc.clearEntry();
  }

  if (value === 'AC') {
    return (calc) => calc.clearAll();
  }

  // Backspace handler
  if (value === 'BACKSPACE') {
    return (calc) => calc.backspace();
  }

  // Toggle sign handler
  if (value === 'TOGGLE_SIGN') {
    return (calc) => calc.toggleSign();
  }

  // Memory handlers
  if (value === 'MC') {
    return (calc) => calc.memoryClear();
  }

  if (value === 'MR') {
    return (calc) => calc.memoryRecall();
  }

  if (value === 'M+') {
    return (calc) => calc.memoryAdd();
  }

  if (value === 'M-') {
    return (calc) => calc.memorySubtract();
  }

  if (value === 'MS') {
    return (calc) => calc.memoryStore();
  }

  // Parentheses and other operators
  if (value === '(' || value === ')') {
    return (calc) => calc.digit(value);
  }

  if (value === '%') {
    return (calc) => {
      // For percentage, divide current display by 100
      const current = calc.evaluate(calc.getDisplay() + '/100');
      if (current.success) {
        const num = current.value!;
        calc.clearEntry();
        calc.digit(String(Math.floor(num)));
        if (num % 1 !== 0) {
          calc.decimal();
          const decimalPart = String(num).split('.')[1] || '';
          for (const d of decimalPart) {
            calc.digit(d);
          }
        }
      }
    };
  }

  // Default: no-op
  return () => {};
}

/**
 * Attach click handlers to buttons
 */
export function attachButtonHandlers(
  container: HTMLElement,
  calculator: Calculator,
  onDisplayUpdate?: (display: string) => void,
  onError?: ErrorCallback
): void {
  const buttons = container.querySelectorAll('.calc-btn');
  
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const value = (button as HTMLElement).dataset.value;
      if (!value) return;

      try {
        const handler = getButtonHandler(value);
        handler(calculator);

        // Update display
        const displayEl = document.getElementById('calc-result');
        if (displayEl) {
          displayEl.textContent = calculator.getDisplay();
        }

        onDisplayUpdate?.(calculator.getDisplay());
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Calculation error';
        onError?.(errorMessage);
      }
    });
  });
}

/**
 * Attach keyboard handlers
 */
export function attachKeyboardHandlers(
  calculator: Calculator,
  onDisplayUpdate?: (display: string) => void,
  onError?: ErrorCallback,
  keyboardMapping: KeyboardMapping = DEFAULT_KEYBOARD_MAPPING
): { remove: () => void } {
  const handleKeydown = (event: KeyboardEvent) => {
    // Ignore if user is typing in an input or textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    const value = keyboardMapping[event.key];
    if (!value) return;

    event.preventDefault();

    try {
      const handler = getButtonHandler(value);
      handler(calculator);

      // Update display
      const displayEl = document.getElementById('calc-result');
      if (displayEl) {
        displayEl.textContent = calculator.getDisplay();
      }

      onDisplayUpdate?.(calculator.getDisplay());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation error';
      onError?.(errorMessage);
    }

    // Visual feedback
    const buttons = document.querySelectorAll('.calc-btn');
    buttons.forEach((btn) => {
      const btnValue = (btn as HTMLElement).dataset.value;
      if (btnValue === value) {
        btn.classList.add('calc-btn--pressed');
        setTimeout(() => btn.classList.remove('calc-btn--pressed'), 100);
      }
    });
  };

  document.addEventListener('keydown', handleKeydown);

  // Return cleanup function
  return {
    remove: () => {
      document.removeEventListener('keydown', handleKeydown);
    }
  };
}

/**
 * Attach touch handlers for mobile with improved responsiveness
 */
export function attachTouchHandlers(container: HTMLElement): { remove: () => void } {
  const buttons = container.querySelectorAll('.calc-btn');
  
  const handleTouchStart = (event: TouchEvent) => {
    const button = (event.target as HTMLElement).closest('.calc-btn') as HTMLElement | null;
    if (button) {
      event.preventDefault();
      button.classList.add('calc-btn--pressed');
    }
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const button = (event.target as HTMLElement).closest('.calc-btn') as HTMLElement | null;
    if (button) {
      event.preventDefault();
      button.classList.remove('calc-btn--pressed');
    }
  };

  const handleTouchCancel = (event: TouchEvent) => {
    const button = (event.target as HTMLElement).closest('.calc-btn') as HTMLElement | null;
    if (button) {
      button.classList.remove('calc-btn--pressed');
    }
  };

  // Prevent double-tap zoom on calculator buttons
  const handleTouchMove = () => {
    // If touch moves, remove pressed state
    buttons.forEach((btn) => btn.classList.remove('calc-btn--pressed'));
  };

  container.addEventListener('touchstart', handleTouchStart, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: false });
  container.addEventListener('touchcancel', handleTouchCancel);
  container.addEventListener('touchmove', handleTouchMove, { passive: true });

  // Return cleanup function
  return {
    remove: () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
      container.removeEventListener('touchmove', handleTouchMove);
    }
  };
}