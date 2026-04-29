/**
 * Calculator State Management
 * Handles all state transitions and business logic
 */

export type Operation = '+' | '-' | '*' | '/';

export interface CalculatorState {
  display: string;
  storedValue: number;
  pendingOperation: Operation | null;
  shouldClearDisplay: boolean;
  hasError: boolean;
  errorMessage: string | null;
  lastOperand: number | null;  // For repeating operations with =
}

export const MAX_DIGITS = 15;

export const INITIAL_STATE: CalculatorState = {
  display: '0',
  storedValue: 0,
  pendingOperation: null,
  shouldClearDisplay: false,
  hasError: false,
  errorMessage: null,
  lastOperand: null,
};

export class CalculatorStateManager {
  private state: CalculatorState;

  constructor(state?: Partial<CalculatorState>) {
    this.state = { ...INITIAL_STATE, ...state };
  }

  getState(): CalculatorState {
    return { ...this.state };
  }

  /**
   * Handle digit input (0-9)
   */
  inputDigit(digit: string): void {
    if (this.state.hasError) {
      this.clear();
    }

    if (this.state.shouldClearDisplay) {
      this.state.display = digit;
      this.state.shouldClearDisplay = false;
    } else if (this.state.display === '0' && digit !== '.') {
      this.state.display = digit;
    } else if (this.state.display.replace('.', '').length < MAX_DIGITS) {
      this.state.display += digit;
    }
  }

  /**
   * Handle decimal point input
   */
  inputDecimal(): void {
    if (this.state.hasError) {
      this.clear();
    }

    if (this.state.shouldClearDisplay) {
      this.state.display = '0.';
      this.state.shouldClearDisplay = false;
    } else if (!this.state.display.includes('.')) {
      this.state.display += '.';
    }
  }

  /**
   * Handle operation input (+, -, *, /)
   */
  inputOperation(operation: Operation): void {
    if (this.state.hasError) {
      this.clear();
    }

    const currentValue = this.parseDisplay();

    // If there's a pending operation, evaluate it first
    if (this.state.pendingOperation !== null) {
      const result = this.evaluate(this.state.storedValue, currentValue, this.state.pendingOperation);
      if (result.error) {
        this.state.hasError = true;
        this.state.errorMessage = result.error;
        this.state.display = result.error!;
        return;
      }
      this.state.display = this.formatResult(result.value!);
      this.state.storedValue = result.value!;
    } else {
      this.state.storedValue = currentValue;
    }

    this.state.pendingOperation = operation;
    this.state.shouldClearDisplay = true;
    // Clear lastOperand since we're starting a new operation
    this.state.lastOperand = null;
  }

  /**
   * Handle equals press
   */
  inputEquals(): void {
    if (this.state.hasError || this.state.pendingOperation === null) {
      return;
    }

    // Store current operation before clearing
    const savedOperation = this.state.pendingOperation;
    
    // Check if this is a repeated equals (lastOperand is set)
    const currentValue = this.state.lastOperand ?? this.parseDisplay();
    
    // Store the second operand for repeated equals on first press
    if (this.state.lastOperand === null) {
      this.state.lastOperand = this.parseDisplay();
    }
    
    const result = this.evaluate(this.state.storedValue, currentValue, savedOperation);

    if (result.error) {
      this.state.hasError = true;
      this.state.errorMessage = result.error;
      this.state.display = result.error!;
      this.state.pendingOperation = null;
      this.state.lastOperand = null;
      this.state.shouldClearDisplay = true;
    } else {
      this.state.display = this.formatResult(result.value!);
      this.state.storedValue = result.value!;
      // Keep operation pending for repeated equals
      this.state.pendingOperation = savedOperation;
      this.state.shouldClearDisplay = true;
    }
  }

  /**
   * Handle backspace
   */
  inputBackspace(): void {
    if (this.state.hasError) {
      this.clear();
      return;
    }

    if (this.state.shouldClearDisplay || this.state.display === '0') {
      return;
    }

    if (this.state.display.length === 1 || 
        (this.state.display.length === 2 && this.state.display.startsWith('-'))) {
      // Keep the negative sign for negative numbers
      if (this.state.display.startsWith('-')) {
        this.state.display = '-0';
      } else {
        this.state.display = '0';
      }
    } else {
      this.state.display = this.state.display.slice(0, -1);
    }
  }

  /**
   * Handle clear (C button)
   */
  clear(): void {
    this.state = { ...INITIAL_STATE };
  }

  /**
   * Handle toggle sign (+/-)
   */
  toggleSign(): void {
    if (this.state.hasError || this.state.display === '0') {
      return;
    }

    if (this.state.display.startsWith('-')) {
      this.state.display = this.state.display.slice(1);
    } else {
      this.state.display = '-' + this.state.display;
    }
  }

  /**
   * Handle percent (%)
   */
  inputPercent(): void {
    if (this.state.hasError) {
      this.clear();
      return;
    }

    const value = this.parseDisplay();
    const percentValue = value / 100;
    this.state.display = this.formatResult(percentValue);
  }

  /**
   * Parse display string to number
   */
  private parseDisplay(): number {
    const parsed = parseFloat(this.state.display);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Format number for display
   */
  private formatResult(value: number): string {
    if (!Number.isFinite(value)) {
      return 'Error: Invalid operation';
    }

    // Handle very large or very small numbers with scientific notation
    if (Math.abs(value) >= 1e15 || (Math.abs(value) < 1e-6 && value !== 0)) {
      return value.toExponential(6);
    }

    // Remove trailing zeros
    const str = value.toString();
    if (str.length <= MAX_DIGITS) {
      return str;
    }

    // Limit decimal places
    const result = parseFloat(value.toPrecision(MAX_DIGITS - 1));
    return result.toString();
  }

  /**
   * Evaluate binary operation
   */
  private evaluate(a: number, b: number, operation: Operation): { value?: number; error?: string } {
    switch (operation) {
      case '+':
        return { value: a + b };
      case '-':
        return { value: a - b };
      case '*':
        return { value: a * b };
      case '/':
        if (b === 0) {
          return { error: 'Error: Division by zero' };
        }
        return { value: a / b };
      default:
        return { error: 'Error: Invalid operation' };
    }
  }

  /**
   * Get the expression line for secondary display
   */
  getExpression(): string {
    if (this.state.pendingOperation === null) {
      return '';
    }
    return `${this.state.storedValue} ${this.state.pendingOperation}`;
  }
}