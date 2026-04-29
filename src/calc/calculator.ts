/**
 * Calculator Module
 * 
 * A clean, functional calculator implementation with:
 * - Basic arithmetic operations
 * - Error handling with Result type
 * - Type-safe operations
 * 
 * @module calc
 */

export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

export interface CalculationInput {
  operand1: number;
  operand2: number;
  operation: Operation;
}

export interface Result<T> {
  success: boolean;
  value?: T;
  error?: string;
}

// Operation mappings
const operations: Record<Operation, (a: number, b: number) => number> = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => b === 0 ? NaN : a / b,
};

const symbols: Record<Operation, string> = {
  add: '+',
  subtract: '-',
  multiply: '×',
  divide: '÷',
};

export function calculate(input: CalculationInput): Result<number> {
  const { operand1, operand2, operation } = input;
  
  if (typeof operand1 !== 'number' || typeof operand2 !== 'number') {
    return { success: false, error: 'Invalid operands' };
  }
  
  if (isNaN(operand1) || isNaN(operand2)) {
    return { success: false, error: 'Operands must be valid numbers' };
  }
  
  if (!operations[operation]) {
    return { success: false, error: `Unknown operation: ${operation}` };
  }
  
  const result = operations[operation](operand1, operand2);
  
  if (isNaN(result)) {
    return { success: false, error: 'Division by zero' };
  }
  
  return { success: true, value: result };
}

export function calculateString(expression: string): Result<number> {
  // Tokenize: "2 + 3", "10 * 5", etc.
  const parts = expression.trim().split(/\s+/);
  
  if (parts.length !== 3) {
    return { success: false, error: 'Expression must be in format: <num> <op> <num>' };
  }
  
  const [, opStr, ] = parts;
  const operand1 = parseFloat(parts[0]);
  const operand2 = parseFloat(parts[2]);
  
  // Map symbol to operation
  const symbolToOp: Record<string, Operation> = {
    '+': 'add',
    '-': 'subtract',
    '*': 'multiply',
    '×': 'multiply',
    '/': 'divide',
    '÷': 'divide',
  };
  
  const operation = symbolToOp[opStr];
  if (!operation) {
    return { success: false, error: `Unknown operator: ${opStr}` };
  }
  
  return calculate({ operand1, operand2, operation });
}

export function formatResult(result: number): string {
  if (!Number.isFinite(result)) return 'Error';
  if (result === Math.floor(result) && Math.abs(result) < 1e12) {
    return result.toString();
  }
  return parseFloat(result.toPrecision(10)).toString();
}

export { symbols };
