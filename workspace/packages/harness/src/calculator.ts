/**
 * Type-safe Calculator Core
 * Provides basic arithmetic operations with comprehensive type safety
 */

/**
 * Supported arithmetic operations
 */
export type Operation = '+' | '-' | '*' | '/' | 'add' | 'subtract' | 'multiply' | 'divide';

/**
 * Result type that represents either a successful calculation or an error
 */
export type CalculationResult = 
  | { success: true; value: number }
  | { success: false; error: string };

/**
 * Input for a calculation
 */
export interface CalculationInput {
  operand1: number;
  operand2: number;
  operation: Operation;
}

/**
 * Validates that a value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Validates calculation input
 */
export function validateInput(input: unknown): input is CalculationInput {
  if (!input || typeof input !== 'object') return false;
  
  const { operand1, operand2, operation } = input as Record<string, unknown>;
  
  if (!isValidNumber(operand1) || !isValidNumber(operand2)) {
    return false;
  }
  
  const validOperations: Operation[] = ['+', '-', '*', '/', 'add', 'subtract', 'multiply', 'divide'];
  return validOperations.includes(operation as Operation);
}

/**
 * Maps operation alias to core operator
 */
function normalizeOperation(operation: Operation): string {
  const operationMap: Record<string, string> = {
    'add': '+',
    'subtract': '-',
    'multiply': '*',
    'divide': '/'
  };
  return operationMap[operation] ?? operation;
}

/**
 * Adds two numbers
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Subtracts b from a
 */
export function subtract(a: number, b: number): number {
  return a - b;
}

/**
 * Multiplies two numbers
 */
export function multiply(a: number, b: number): number {
  return a * b;
}

/**
 * Divides a by b
 * @throws Error if b is zero
 */
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero is not allowed');
  }
  return a / b;
}

/**
 * Performs a calculation with the given inputs
 * Returns a Result type for safe error handling
 */
export function calculate(input: CalculationInput): CalculationResult {
  try {
    const { operand1, operand2, operation } = input;
    const operator = normalizeOperation(operation);
    
    let result: number;
    
    switch (operator) {
      case '+':
        result = add(operand1, operand2);
        break;
      case '-':
        result = subtract(operand1, operand2);
        break;
      case '*':
        result = multiply(operand1, operand2);
        break;
      case '/':
        result = divide(operand1, operand2);
        break;
      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }
    
    return { success: true, value: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Performs a calculation and throws on error
 * Use this when you're confident the input is valid
 */
export function calculateStrict(input: CalculationInput): number {
  const result = calculate(input);
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return result.value;
}