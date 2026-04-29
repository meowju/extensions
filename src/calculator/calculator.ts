// Calculator with full state management and operator precedence
// [V3.6] Implements shunting-yard algorithm for proper PEMDAS evaluation

export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'modulo';

export type Result<T> =
  | { success: true; value: T }
  | { success: false; error: Error };

export interface CalculatorState {
  currentValue: string;
  previousValue: string | null;
  operator: Operation | null;
  waitingForOperand: boolean;
  hasError: boolean;
  expression: string;
  memory: number;
  pendingExpression: string | null;
}

export const CalculatorErrorCode = {
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  MODULO_BY_ZERO: 'MODULO_BY_ZERO',
  OVERFLOW: 'OVERFLOW',
  INVALID_INPUT: 'INVALID_INPUT',
} as const;

export class CalculatorError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly operation?: string
  ) {
    super(message);
    this.name = 'CalculatorError';
  }
}

const MAX_DIGITS = 12;
const DISPLAY_ERROR = 'Error';

export class Calculator {
  private _state: CalculatorState;

  constructor() {
    this._state = this.createInitialState();
  }

  private createInitialState(): CalculatorState {
    return {
      currentValue: '0',
      previousValue: null,
      operator: null,
      waitingForOperand: false,
      hasError: false,
      expression: '',
      memory: 0,
      pendingExpression: null,
    };
  }

  // State accessors
  get currentValue(): string { return this._state.currentValue; }
  get hasError(): boolean { return this._state.hasError; }
  get isWaitingForOperand(): boolean { return this._state.waitingForOperand; }
  get memory(): number { return this._state.memory; }

  getState(): Readonly<CalculatorState> {
    return { ...this._state };
  }

  // Internal operations
  private applyOp(op: string, a: number, b: number): number {
    switch (op) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide': 
        if (b === 0) throw new CalculatorError('Division by zero', CalculatorErrorCode.DIVISION_BY_ZERO);
        return a / b;
      case 'modulo':
        if (b === 0) throw new CalculatorError('Modulo by zero', CalculatorErrorCode.MODULO_BY_ZERO);
        return a % b;
      case 'power': return Math.pow(a, b);
      default: throw new CalculatorError(`Unknown operator: ${op}`, CalculatorErrorCode.INVALID_INPUT);
    }
  }

  // Shunting-yard algorithm for operator precedence
  private evaluateExpression(expr: string): number {
    const tokens = this.tokenize(expr);
    const output: number[] = [];
    const ops: string[] = [];

    const precedence: Record<string, number> = {
      'add': 1, 'subtract': 1, 'multiply': 2, 'divide': 2, 'modulo': 2, 'power': 3,
      '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3
    };

    const normalizeOp = (op: string): string => {
      switch (op) {
        case '+': return 'add';
        case '-': return 'subtract';
        case '*': return 'multiply';
        case '/': return 'divide';
        case '%': return 'modulo';
        case '^': return 'power';
        default: return op;
      }
    };

    for (const token of tokens) {
      if (typeof token === 'number') {
        output.push(token);
      } else if (token === '(') {
        ops.push('(');
      } else if (token === ')') {
        while (ops.length > 0 && ops[ops.length - 1] !== '(') {
          const op = ops.pop()!;
          const b = output.pop()!;
          const a = output.pop()!;
          output.push(this.applyOp(op, a, b));
        }
        ops.pop(); // Remove '('
      } else if (['+', '-', '*', '/', '%', '^'].includes(token)) {
        const op = normalizeOp(token);
        const prec = precedence[op] ?? 0;
        const isRightAssoc = op === 'power';

        while (ops.length > 0 && ops[ops.length - 1] !== '(') {
          const top = normalizeOp(ops[ops.length - 1]);
          const topPrec = precedence[top] ?? 0;
          const shouldPop = topPrec > prec || (topPrec === prec && !isRightAssoc);
          if (shouldPop) {
            const poppedOp = ops.pop()!;
            const b = output.pop()!;
            const a = output.pop()!;
            output.push(this.applyOp(poppedOp, a, b));
          } else {
            break;
          }
        }
        ops.push(op);
      }
    }

    while (ops.length > 0) {
      const op = ops.pop()!;
      if (op === '(') continue;
      const b = output.pop()!;
      const a = output.pop()!;
      output.push(this.applyOp(op, a, b));
    }

    return output[0];
  }

  private tokenize(expr: string): Array<string | number> {
    const tokens: Array<string | number> = [];
    let i = 0;
    const normalized = expr.replace(/×/g, '*').replace(/÷/g, '/');

    while (i < normalized.length) {
      const char = normalized[i];
      if (/\s/.test(char)) { i++; continue; }
      
      if (char === '(' || char === ')') {
        tokens.push(char);
        i++;
        continue;
      }

      if (char === '-' && (tokens.length === 0 || ['+', '-', '*', '/', '^', '%', '(', 'add', 'subtract', 'multiply', 'divide', 'modulo', 'power'].includes(String(tokens[tokens.length - 1])))) {
        i++;
        let num = '-';
        while (i < normalized.length && /[0-9.]/.test(normalized[i])) {
          num += normalized[i];
          i++;
        }
        if (num !== '-') tokens.push(parseFloat(num));
        continue;
      }

      if (/[0-9.]/.test(char)) {
        let num = '';
        while (i < normalized.length && /[0-9.]/.test(normalized[i])) {
          num += normalized[i];
          i++;
        }
        tokens.push(parseFloat(num));
      } else if (['+', '-', '*', '/', '^', '%'].includes(char)) {
        tokens.push(char);
        i++;
      } else if (/[a-z]/.test(char)) {
        let word = '';
        while (i < normalized.length && /[a-z]/.test(normalized[i])) {
          word += normalized[i];
          i++;
        }
        tokens.push(word);
      } else {
        i++;
      }
    }
    return tokens;
  }

  // Input handlers
  digit(char: string): void {
    if (this._state.hasError) return;
    if (!/^[0-9]$/.test(char)) return;

    if (this._state.waitingForOperand) {
      this._state.currentValue = char;
      this._state.waitingForOperand = false;
      return;
    }

    const digitCount = this._state.currentValue.replace(/[^0-9]/g, '').length;
    if (digitCount >= MAX_DIGITS) return;

    if (this._state.currentValue === '0' && char !== '0') {
      this._state.currentValue = char;
    } else if (this._state.currentValue !== '0' || char === '0') {
      this._state.currentValue += char;
    }
  }

  decimal(): void {
    if (this._state.hasError) return;
    if (this._state.waitingForOperand) {
      this._state.currentValue = '0.';
      this._state.waitingForOperand = false;
      return;
    }
    if (!this._state.currentValue.includes('.')) {
      this._state.currentValue += '.';
    }
  }

  inputOperatorSymbol(op: string): void {
    const symbolToOp: Record<string, Operation> = {
      '+': 'add', '-': 'subtract', '*': 'multiply', '×': 'multiply',
      '/': 'divide', '÷': 'divide', '^': 'power', '%': 'modulo',
    };
    const operation = symbolToOp[op] as Operation;
    if (!operation) return;

    if (this._state.hasError) return;

    const opSymbols: Record<string, string> = {
      add: '+', subtract: '-', multiply: '×', divide: '÷', power: '^', modulo: '%'
    };
    const opSymbol = opSymbols[operation];

    if (!this._state.operator) {
      this._state.previousValue = this._state.currentValue;
      this._state.operator = operation;
      this._state.waitingForOperand = true;
      this._state.expression = `${this._state.previousValue} ${opSymbol}`;
      this._state.pendingExpression = `${this._state.previousValue} ${opSymbol}`;
      return;
    }

    if (this._state.waitingForOperand) {
      this._state.operator = operation;
      this._state.expression = `${this._state.previousValue} ${opSymbol}`;
      this._state.pendingExpression = `${this._state.previousValue} ${opSymbol}`;
      return;
    }

    const currentExpr = this._state.pendingExpression || '';
    const newExpr = currentExpr + this._state.currentValue + ' ' + opSymbol;
    this._state.pendingExpression = newExpr;
    this._state.previousValue = this._state.currentValue;
    this._state.operator = operation;
    this._state.waitingForOperand = true;
    this._state.expression = newExpr;
  }

  equals(): Result<number> {
    if (this._state.hasError) {
      return { success: false, error: new Error('Calculator in error state') };
    }
    if (!this._state.operator || !this._state.previousValue) {
      return { success: true, value: parseFloat(this._state.currentValue) };
    }

    let expr: string;
    if (this._state.pendingExpression) {
      expr = this._state.pendingExpression + this._state.currentValue;
    } else {
      const opSymbols: Record<string, string> = {
        add: '+', subtract: '-', multiply: '*', divide: '/', power: '^', modulo: '%'
      };
      const currentOpSymbol = opSymbols[this._state.operator] || this._state.operator;
      expr = `${this._state.previousValue} ${currentOpSymbol} ${this._state.currentValue}`;
    }

    try {
      const result = this.evaluateExpression(expr);
      if (!Number.isFinite(result)) {
        return { success: false, error: new Error('Calculation overflow') };
      }

      this._state.currentValue = result.toString();
      this._state.waitingForOperand = true;
      this._state.operator = null;
      this._state.previousValue = null;
      this._state.pendingExpression = null;
      this._state.expression = `${expr} =`;

      return { success: true, value: result };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }

  evaluate(expr: string): Result<number> {
    const trimmed = expr.trim();
    if (!trimmed) return { success: false, error: new Error('Empty expression') };

    try {
      const result = this.evaluateExpression(trimmed);
      this._state.currentValue = result.toString();
      return { success: true, value: result };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }

  getDisplay(): string {
    if (this._state.hasError) return DISPLAY_ERROR;
    return this._state.currentValue;
  }

  clearAll(): void {
    const memory = this._state.memory;
    this._state = this.createInitialState();
    this._state.memory = memory;
  }

  clearEntry(): void {
    if (this._state.hasError) {
      this.clearAll();
      return;
    }
    this._state.currentValue = '0';
  }

  backspace(): void {
    if (this._state.hasError) {
      this.clearAll();
      return;
    }
    if (this._state.waitingForOperand) return;

    const current = this._state.currentValue;
    if (current.length <= 1 || (current.length === 2 && current[0] === '-')) {
      this._state.currentValue = '0';
      return;
    }
    this._state.currentValue = current.slice(0, -1);
  }

  toggleSign(): void {
    if (this._state.hasError || this._state.waitingForOperand) return;
    const value = parseFloat(this._state.currentValue);
    this._state.currentValue = (value * -1).toString();
  }

  memoryStore(): void {
    this._state.memory = parseFloat(this._state.currentValue);
  }

  memoryRecall(): void {
    this._state.currentValue = this._state.memory.toString();
    this._state.waitingForOperand = true;
  }

  memoryClear(): void {
    this._state.memory = 0;
  }

  memoryAdd(): void {
    const value = parseFloat(this._state.currentValue);
    if (!isNaN(value)) this._state.memory += value;
  }

  memorySubtract(): void {
    const value = parseFloat(this._state.currentValue);
    if (!isNaN(value)) this._state.memory -= value;
  }

  getHistory(): string[] {
    return [];
  }

  clearHistory(): void {
    // History not yet implemented
  }

  // Direct math methods
  add(a: number, b: number): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new CalculatorError('Invalid operands', CalculatorErrorCode.INVALID_INPUT);
    }
    return a + b;
  }

  subtract(a: number, b: number): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new CalculatorError('Invalid operands', CalculatorErrorCode.INVALID_INPUT);
    }
    return a - b;
  }

  multiply(a: number, b: number): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new CalculatorError('Invalid operands', CalculatorErrorCode.INVALID_INPUT);
    }
    return a * b;
  }

  divide(a: number, b: number): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new CalculatorError('Invalid operands', CalculatorErrorCode.INVALID_INPUT);
    }
    if (b === 0) {
      throw new CalculatorError('Division by zero is not allowed', CalculatorErrorCode.DIVISION_BY_ZERO, 'divide');
    }
    return a / b;
  }

  modulo(a: number, b: number): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new CalculatorError('Invalid operands', CalculatorErrorCode.INVALID_INPUT);
    }
    if (b === 0) {
      throw new CalculatorError('Modulo by zero is not allowed', CalculatorErrorCode.MODULO_BY_ZERO, 'modulo');
    }
    return a % b;
  }
}

// Factory function
export function createCalculator(): Calculator {
  return new Calculator();
}

// Singleton instance
export const calculator = new Calculator();
export default calculator;

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log('Usage: npx ts-node calculator.ts <num1> <operation> <num2>');
    console.log('Operations: add, subtract, multiply, divide');
    console.log('Example: npx ts-node calculator.ts 10 add 5');
    process.exit(1);
  }

  const num1 = parseFloat(args[0]);
  const operation = args[1];
  const num2 = parseFloat(args[2]);

  const calc = new Calculator();

  try {
    let result: number;
    switch (operation) {
      case 'add': result = calc.add(num1, num2); break;
      case 'subtract': result = calc.subtract(num1, num2); break;
      case 'multiply': result = calc.multiply(num1, num2); break;
      case 'divide': result = calc.divide(num1, num2); break;
      default: throw new Error(`Unknown operation: ${operation}`);
    }
    console.log(`${num1} ${operation} ${num2} = ${result}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}
