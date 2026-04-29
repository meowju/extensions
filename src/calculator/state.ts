/**
 * Calculator state management
 * Manages the current state of the calculator including display, memory, and history
 */

import { Token } from './tokenizer';
import { BINARY_OPERATIONS } from './operations';

/**
 * Calculator display modes
 */
export enum DisplayMode {
  DECIMAL = 'DECIMAL',
  SCIENTIFIC = 'SCIENTIFIC',
  ENGINEERING = 'ENGINEERING',
}

/**
 * Calculator state interface
 */
export interface CalculatorState {
  /** Current display value */
  display: string;
  /** Internal accumulated value */
  accumulator: number;
  /** Pending binary operation */
  pendingOperation: string | null;
  /** Pending operand for binary operation */
  pendingOperand: number | null;
  /** Expression being built for display */
  expression: string;
  /** Calculator memory */
  memory: number;
  /** Angle mode (degrees/radians) - for future trigonometric functions */
  angleMode: 'degrees' | 'radians';
  /** Display format mode */
  displayMode: DisplayMode;
  /** Whether the last action was an operation (for chaining) */
  lastWasOperation: boolean;
  /** Error state */
  error: string | null;
  /** History of calculations */
  history: HistoryEntry[];
}

/**
 * Single history entry
 */
export interface HistoryEntry {
  expression: string;
  result: number;
  timestamp: number;
}

/**
 * Maximum history entries to keep
 */
const MAX_HISTORY = 50;

/**
 * Initial calculator state
 */
export const INITIAL_STATE: CalculatorState = {
  display: '0',
  accumulator: 0,
  pendingOperation: null,
  pendingOperand: null,
  expression: '',
  memory: 0,
  angleMode: 'degrees',
  displayMode: DisplayMode.DECIMAL,
  lastWasOperation: false,
  error: null,
  history: [],
};

/**
 * State manager class for calculator state
 */
export class CalculatorStateManager {
  private state: CalculatorState;

  constructor(initialState: CalculatorState = INITIAL_STATE) {
    this.state = { ...initialState };
  }

  /**
   * Get current state
   */
  getState(): CalculatorState {
    return { ...this.state };
  }

  /**
   * Get a specific value from state
   */
  get<K extends keyof CalculatorState>(key: K): CalculatorState[K] {
    return this.state[key];
  }

  /**
   * Set a specific value in state
   */
  set<K extends keyof CalculatorState>(key: K, value: CalculatorState[K]): void {
    this.state[key] = value;
  }

  /**
   * Update multiple state values
   */
  update(updates: Partial<CalculatorState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = { ...INITIAL_STATE, history: this.state.history };
  }

  /**
   * Clear all state including history
   * [V3.6] Fixed: Preserves memory on clearAll (memory persists across clear operations)
   */
  clearAll(): void {
    const memory = this.state.memory; // Preserve memory
    this.state = { ...INITIAL_STATE, memory };
  }

  /**
   * Input a digit to the display
   * [V3.6] Fixed: Correctly handles digits after operator input
   */
  inputDigit(digit: string): void {
    if (this.state.error) {
      this.state.error = null;
      this.state.display = digit;
      this.state.lastWasOperation = false;
      // Clear pending operation since we're starting fresh input
      this.state.pendingOperation = null;
      this.state.pendingOperand = null;
      return;
    }

    if (this.state.lastWasOperation) {
      // After pressing an operator, start fresh with new digit
      this.state.display = digit;
      this.state.lastWasOperation = false;
    } else if (this.state.display === '0') {
      this.state.display = digit;
    } else {
      this.state.display += digit;
    }
  }

  /**
   * Input a decimal point
   */
  inputDecimal(): void {
    if (this.state.error) {
      this.state.display = '0.';
      this.state.error = null;
      this.state.lastWasOperation = false;
      return;
    }

    if (this.state.lastWasOperation) {
      this.state.display = '0.';
      this.state.lastWasOperation = false;
    } else if (!this.state.display.includes('.')) {
      this.state.display += '.';
    }
  }

  /**
   * Input an operator
   * [V3.6] Fixed: Correctly handles operator chaining
   */
  inputOperator(operator: string): void {
    if (this.state.error) return;

    const currentValue = this.parseDisplay();

    // If there's a pending operation, execute it first (chaining)
    if (this.state.pendingOperation && this.state.pendingOperand !== null) {
      const result = this.evaluateBinary(
        this.state.accumulator,
        this.state.pendingOperation,
        this.state.pendingOperand
      );

      if (result.success) {
        this.state.accumulator = result.value;
        this.state.display = this.formatDisplay(result.value);
      } else {
        this.state.error = result.error;
        this.state.display = 'Error';
        return;
      }
    } else {
      // No pending operation - set accumulator to current display value
      this.state.accumulator = currentValue;
    }

    // [V3.6] Store current value as pending operand for the new operation
    this.state.pendingOperation = operator;
    this.state.pendingOperand = currentValue;
    this.state.lastWasOperation = true;
    this.state.expression = `${this.state.accumulator} ${operator}`;
  }

  /**
   * Execute the pending operation
   * [V3.6] Fixed: Uses display value as second operand, not pendingOperand
   */
  executePending(): number | null {
    if (!this.state.pendingOperation) {
      return this.parseDisplay();
    }

    // [V3.6] Use current display value as the second operand
    // This correctly handles the case where user types new digits after operator
    const secondOperand = this.parseDisplay();

    const result = this.evaluateBinary(
      this.state.accumulator,            // First operand = accumulated result
      this.state.pendingOperation,        // Operation
      secondOperand                       // Second operand = current display
    );

    if (result.success) {
      this.addToHistory(
        `${this.state.accumulator} ${this.state.pendingOperation} ${secondOperand}`,
        result.value
      );
      this.state.display = this.formatDisplay(result.value);
      this.state.accumulator = result.value;
      this.state.pendingOperation = null;
      this.state.pendingOperand = null;
      this.state.expression = '';
      this.state.lastWasOperation = true;
      return result.value;
    } else {
      this.state.error = result.error;
      this.state.display = 'Error';
      return null;
    }
  }

  /**
   * Calculate the final result (equals)
   */
  calculate(): number | null {
    return this.executePending();
  }

  /**
   * Memory operations
   */
  memoryAdd(): void {
    const value = this.parseDisplay();
    this.state.memory += value;
  }

  memorySubtract(): void {
    const value = this.parseDisplay();
    this.state.memory -= value;
  }

  memoryRecall(): void {
    this.state.display = this.formatDisplay(this.state.memory);
    this.state.lastWasOperation = false;
  }

  memoryClear(): void {
    this.state.memory = 0;
  }

  memoryStore(): void {
    this.state.memory = this.parseDisplay();
  }

  /**
   * Clear the current entry
   */
  clearEntry(): void {
    this.state.display = '0';
    this.state.error = null;
    this.state.lastWasOperation = false;
  }

  /**
   * Backspace - remove last digit
   */
  backspace(): void {
    if (this.state.error) {
      this.state.display = '0';
      this.state.error = null;
      return;
    }

    if (this.state.display.length === 1 || 
        (this.state.display.length === 2 && this.state.display[0] === '-')) {
      this.state.display = '0';
    } else {
      this.state.display = this.state.display.slice(0, -1);
    }
  }

  /**
   * Toggle sign (+/-)
   */
  toggleSign(): void {
    if (this.state.display === '0') return;
    if (this.state.display.startsWith('-')) {
      this.state.display = this.state.display.slice(1);
    } else {
      this.state.display = '-' + this.state.display;
    }
  }

  /**
   * Parse display string to number
   */
  parseDisplay(): number {
    const parsed = parseFloat(this.state.display);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Format number for display
   */
  formatDisplay(value: number): string {
    if (!Number.isFinite(value)) {
      return 'Error';
    }

    switch (this.state.displayMode) {
      case DisplayMode.SCIENTIFIC:
        return value.toExponential(6);
      case DisplayMode.ENGINEERING:
        return value.toExponential(3);
      case DisplayMode.DECIMAL:
      default:
        // Use reasonable precision, removing trailing zeros
        const formatted = value.toPrecision(10);
        return parseFloat(formatted).toString();
    }
  }

  /**
   * Add entry to history
   */
  private addToHistory(expression: string, result: number): void {
    this.state.history.unshift({
      expression,
      result,
      timestamp: Date.now(),
    });

    if (this.state.history.length > MAX_HISTORY) {
      this.state.history = this.state.history.slice(0, MAX_HISTORY);
    }
  }

  /**
   * Get history
   */
  getHistory(): HistoryEntry[] {
    return [...this.state.history];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.state.history = [];
  }

  /**
   * Evaluate binary operation (placeholder - calls parser)
   */
  private evaluateBinary(a: number, op: string, b: number): { success: boolean; value?: number; error?: string } {
    const operation = BINARY_OPERATIONS[op];
    
    if (!operation) {
      return { success: false, error: `Unknown operator: ${op}` };
    }

    const result = operation.execute(a, b);
    if (result.success) {
      return { success: true, value: result.value };
    } else {
      return { success: false, error: result.error };
    }
  }
}

/**
 * Create a new state manager instance
 */
export function createCalculatorState(initialState?: CalculatorState): CalculatorStateManager {
  return new CalculatorStateManager(initialState);
}