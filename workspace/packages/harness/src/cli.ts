/**
 * Console Interface for the Calculator
 * Handles user input/output with type safety
 */

import * as readline from 'readline';
import { 
  Operation, 
  CalculationInput, 
  calculate, 
  validateInput,
  isValidNumber 
} from './calculator.js';

interface PromptConfig {
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
}

/**
 * Creates a readline interface for console input
 */
function createInterface(config?: PromptConfig): readline.Interface {
  return readline.createInterface({
    input: config?.input ?? process.stdin,
    output: config?.output ?? process.stdout,
  });
}

/**
 * Displays the welcome message and usage instructions
 */
export function displayHelp(): void {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           TypeScript Calculator - Help                     ║
╠════════════════════════════════════════════════════════════╣
║  Supported operations:                                     ║
║    + , add      - Addition                                ║
║    - , subtract - Subtraction                             ║
║    * , multiply - Multiplication                          ║
║    / , divide   - Division                                ║
║                                                            ║
║  Input format: <number1> <operation> <number2>             ║
║  Examples:                                                 ║
║    10 + 5                                                  ║
║    25 multiply 4                                           ║
║    100 divide 0     (will show error)                      ║
║                                                            ║
║  Commands:                                                  ║
║    help    - Show this message                             ║
║    clear   - Clear the screen                             ║
║    history - Show calculation history                      ║
║    quit    - Exit the calculator                           ║
╚════════════════════════════════════════════════════════════╝
  `);
}

/**
 * Parses user input into a CalculationInput
 */
export function parseInput(input: string): CalculationInput | null {
  const trimmed = input.trim().toLowerCase();
  
  // Handle command shortcuts
  if (trimmed === 'h') {
    return null;
  }
  
  // Tokenize the input
  const tokens = trimmed.split(/\s+/);
  
  if (tokens.length !== 3) {
    return null;
  }
  
  const [operand1Str, operationStr, operand2Str] = tokens;
  
  const operand1 = parseFloat(operand1Str);
  const operand2 = parseFloat(operand2Str);
  
  if (!isValidNumber(operand1) || !isValidNumber(operand2)) {
    return null;
  }
  
  // Normalize operation aliases
  const operationMap: Record<string, Operation> = {
    '+': '+',
    'add': '+',
    '-': '-',
    'subtract': '-',
    'sub': '-',
    '*': '*',
    'multiply': '*',
    'mul': '*',
    'x': '*',
    '/': '/',
    'divide': '/',
    'div': '/'
  };
  
  const operation = operationMap[operationStr];
  
  if (!operation) {
    return null;
  }
  
  return { operand1, operand2, operation };
}

/**
 * Formats a calculation result for display
 */
export function formatResult(input: CalculationInput, result: number): string {
  const opSymbol = input.operation.length === 1 
    ? input.operation 
    : input.operation.charAt(0).toUpperCase() + input.operation.slice(1);
  
  return `${input.operand1} ${opSymbol} ${input.operand2} = ${result}`;
}

/**
 * Calculator CLI class
 */
export class CalculatorCLI {
  private history: string[] = [];
  private isRunning: boolean = false;
  
  /**
   * Starts the calculator REPL
   */
  async start(): Promise<void> {
    this.isRunning = true;
    console.log('\n🎮 TypeScript Calculator - Type "help" for usage\n');
    
    const rl = createInterface();
    
    this.prompt(rl);
  }
  
  /**
   * Stops the calculator REPL
   */
  stop(): void {
    this.isRunning = false;
  }
  
  /**
   * Gets calculation history
   */
  getHistory(): string[] {
    return [...this.history];
  }
  
  /**
   * Clears calculation history
   */
  clearHistory(): void {
    this.history = [];
  }
  
  private prompt(rl: readline.Interface): void {
    rl.question('calc> ', (input) => {
      if (!this.isRunning) {
        rl.close();
        return;
      }
      
      this.processInput(input, rl);
    });
  }
  
  private processInput(input: string, rl: readline.Interface): void {
    const trimmed = input.trim().toLowerCase();
    
    // Handle commands
    switch (trimmed) {
      case 'quit':
      case 'exit':
      case 'q':
        this.isRunning = false;
        console.log('\n👋 Goodbye! Thanks for calculating!\n');
        rl.close();
        return;
        
      case 'help':
      case 'h':
      case '?':
        displayHelp();
        this.prompt(rl);
        return;
        
      case 'clear':
      case 'cls':
        console.clear();
        this.prompt(rl);
        return;
        
      case 'history':
      case 'hist':
        this.showHistory();
        this.prompt(rl);
        return;
        
      case 'clear history':
      case 'clearhist':
        this.clearHistory();
        console.log('📋 History cleared\n');
        this.prompt(rl);
        return;
    }
    
    // Try to parse and execute calculation
    const calculation = parseInput(input);
    
    if (!calculation) {
      console.log('❌ Invalid input. Use format: <number> <operation> <number>\n');
      console.log('   Example: 10 + 5\n');
      this.prompt(rl);
      return;
    }
    
    const result = calculate(calculation);
    
    if (result.success) {
      const formattedResult = formatResult(calculation, result.value);
      console.log(`✅ ${formattedResult}\n`);
      this.history.push(formattedResult);
    } else {
      console.log(`❌ Error: ${result.error}\n`);
    }
    
    this.prompt(rl);
  }
  
  private showHistory(): void {
    if (this.history.length === 0) {
      console.log('📋 No calculations in history\n');
      return;
    }
    
    console.log('\n📋 Calculation History:');
    console.log('─'.repeat(40));
    this.history.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry}`);
    });
    console.log('─'.repeat(40) + '\n');
  }
}

/**
 * Run calculation from command line arguments
 */
export function runFromArgs(args: string[]): string | null {
  if (args.length < 3) {
    return null;
  }
  
  const [, operand1Str, operationStr, operand2Str] = args;
  const input = `${operand1Str} ${operationStr} ${operand2Str}`;
  const calculation = parseInput(input);
  
  if (!calculation) {
    return 'Invalid input format';
  }
  
  const result = calculate(calculation);
  
  if (result.success) {
    return formatResult(calculation, result.value);
  }
  
  return `Error: ${result.error}`;
}