/**
 * Calculator UI Class
 * Main UI component that orchestrates display, buttons, and event handling
 */

import { Calculator, createCalculator } from '../calculator/calculator';
import { 
  BUTTON_LAYOUT, 
  createButton, 
  createDisplay, 
  createCalculatorContainer,
  ButtonConfig 
} from './elements';
import { 
  attachButtonHandlers, 
  attachKeyboardHandlers,
  attachTouchHandlers 
} from './handlers';

/**
 * Callback type for calculator events
 */
export type DisplayUpdateCallback = (display: string, expression?: string) => void;
export type CalculationCallback = (expression: string, result: number) => void;
export type ErrorCallback = (error: string) => void;

/**
 * Keyboard key mapping configuration
 */
export interface KeyboardMapping {
  [key: string]: string;
}

/**
 * Default keyboard mapping for calculator
 */
export const DEFAULT_KEYBOARD_MAPPING: KeyboardMapping = {
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
 * Calculator UI configuration
 */
export interface CalculatorUIConfig {
  /** Target container element or selector */
  container: HTMLElement | string;
  /** Initial value to display */
  initialValue?: string;
  /** Enable keyboard input */
  keyboardEnabled?: boolean;
  /** Enable touch handlers */
  touchEnabled?: boolean;
  /** Custom keyboard mapping */
  keyboardMapping?: KeyboardMapping;
  /** Callback when display is updated */
  onDisplayUpdate?: DisplayUpdateCallback;
  /** Callback when calculation is performed */
  onCalculation?: CalculationCallback;
  /** Callback on error */
  onError?: ErrorCallback;
}

/**
 * Calculator UI Class
 * Provides the complete calculator interface
 */
export class CalculatorUI {
  private calculator: Calculator;
  private container: HTMLElement;
  private displayElement: HTMLElement | null = null;
  private expressionElement: HTMLElement | null = null;
  private resultElement: HTMLElement | null = null;
  private config: Required<CalculatorUIConfig>;
  private keyboardMapping: KeyboardMapping;
  private isInitialized: boolean = false;
  private errorDisplayTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Create a new Calculator UI instance
   */
  constructor(config: CalculatorUIConfig) {
    // Resolve container (selector or element)
    const containerEl = typeof config.container === 'string'
      ? document.querySelector(config.container)
      : config.container;

    if (!containerEl) {
      throw new Error(`Calculator container not found: ${config.container}`);
    }

    this.container = containerEl as HTMLElement;
    this.calculator = createCalculator();
    this.keyboardMapping = config.keyboardMapping || DEFAULT_KEYBOARD_MAPPING;

    this.config = {
      container: containerEl as HTMLElement,
      initialValue: config.initialValue || '0',
      keyboardEnabled: config.keyboardEnabled ?? true,
      touchEnabled: config.touchEnabled ?? true,
      keyboardMapping: this.keyboardMapping,
      onDisplayUpdate: config.onDisplayUpdate || (() => {}),
      onCalculation: config.onCalculation || (() => {}),
      onError: config.onError || (() => {}),
    };

    // Initialize with initial value if provided
    if (this.config.initialValue !== '0') {
      this.setDisplay(this.config.initialValue);
    }
  }

  /**
   * Initialize the UI
   */
  init(): void {
    if (this.isInitialized) {
      console.warn('CalculatorUI already initialized');
      return;
    }

    // Create calculator container
    const calcContainer = createCalculatorContainer();
    
    // Create display
    this.displayElement = createDisplay();
    calcContainer.appendChild(this.displayElement);
    
    // Get display elements
    this.expressionElement = this.displayElement.querySelector('#calc-expression');
    this.resultElement = this.displayElement.querySelector('#calc-result');

    // Create button grid
    const buttonGrid = this.createButtonGrid();
    calcContainer.appendChild(buttonGrid);

    // Append to container
    this.container.appendChild(calcContainer);

    // Attach event handlers with callbacks
    attachButtonHandlers(
      calcContainer,
      this.calculator,
      (display) => this.handleDisplayUpdate(display),
      (error) => this.handleError(error)
    );

    if (this.config.keyboardEnabled) {
      attachKeyboardHandlers(
        this.calculator,
        (display) => this.handleDisplayUpdate(display),
        (error) => this.handleError(error),
        this.keyboardMapping
      );
    }

    if (this.config.touchEnabled) {
      attachTouchHandlers(calcContainer);
    }

    this.isInitialized = true;
  }

  /**
   * Create the button grid
   */
  private createButtonGrid(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'calc-grid';

    BUTTON_LAYOUT.forEach((row, rowIndex) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'calc-row';
      rowEl.dataset.row = String(rowIndex);

      row.forEach((config) => {
        const button = createButton(config);
        rowEl.appendChild(button);
      });

      grid.appendChild(rowEl);
    });

    return grid;
  }

  /**
   * Handle display update
   */
  private handleDisplayUpdate(display: string): void {
    // Update result element
    if (this.resultElement) {
      this.resultElement.textContent = display;
    }

    // Clear error state
    this.clearErrorState();

    // Trigger callback
    this.config.onDisplayUpdate(
      display,
      this.expressionElement?.textContent || ''
    );
  }

  /**
   * Handle error from calculator
   */
  private handleError(error: string): void {
    // Update display with error
    if (this.resultElement) {
      this.resultElement.textContent = error;
      this.resultElement.classList.add('calc-display--error');
    }

    // Trigger error callback
    this.config.onError(error);

    // Auto-clear error state after delay
    this.errorDisplayTimeout = setTimeout(() => {
      this.clearErrorState();
      if (this.resultElement) {
        this.resultElement.textContent = this.calculator.getDisplay();
      }
    }, 2000);
  }

  /**
   * Clear error state styling
   */
  private clearErrorState(): void {
    if (this.errorDisplayTimeout) {
      clearTimeout(this.errorDisplayTimeout);
      this.errorDisplayTimeout = null;
    }
    if (this.resultElement) {
      this.resultElement.classList.remove('calc-display--error');
    }
  }

  /**
   * Get the underlying calculator instance
   */
  getCalculator(): Calculator {
    return this.calculator;
  }

  /**
   * Set display value programmatically
   */
  setDisplay(value: string): void {
    this.calculator.clearAll();
    for (const char of value) {
      if (/[0-9]/.test(char)) {
        this.calculator.digit(char);
      } else if (char === '.') {
        this.calculator.decimal();
      }
    }
    
    if (this.resultElement) {
      this.resultElement.textContent = this.calculator.getDisplay();
    }
  }

  /**
   * Get current display value
   */
  getDisplay(): string {
    return this.calculator.getDisplay();
  }

  /**
   * Clear the calculator
   */
  clear(): void {
    this.calculator.clearAll();
    if (this.resultElement) {
      this.resultElement.textContent = '0';
    }
    if (this.expressionElement) {
      this.expressionElement.textContent = '';
    }
  }

  /**
   * Destroy the UI
   */
  destroy(): void {
    // Clear any pending timeouts
    if (this.errorDisplayTimeout) {
      clearTimeout(this.errorDisplayTimeout);
    }

    // Remove all event listeners by cloning the container
    const calcContainer = this.container.querySelector('.calc-container');
    if (calcContainer) {
      calcContainer.replaceWith(calcContainer.cloneNode(true));
    }
    this.isInitialized = false;
  }

  /**
   * Focus on the calculator container for keyboard input
   */
  focus(): void {
    const calcContainer = this.container.querySelector('.calc-container');
    if (calcContainer) {
      (calcContainer as HTMLElement).focus();
    }
  }

  /**
   * Check if calculator is currently focused
   */
  isFocused(): boolean {
    const calcContainer = this.container.querySelector('.calc-container');
    return calcContainer === document.activeElement;
  }

  /**
   * Enable or disable keyboard input
   */
  setKeyboardEnabled(enabled: boolean): void {
    this.config.keyboardEnabled = enabled;
  }

  /**
   * Enable or disable touch handlers
   */
  setTouchEnabled(enabled: boolean): void {
    this.config.touchEnabled = enabled;
  }
}

/**
 * Factory function to create Calculator UI
 */
export function createCalculatorUI(config: CalculatorUIConfig): CalculatorUI {
  const ui = new CalculatorUI(config);
  ui.init();
  return ui;
}