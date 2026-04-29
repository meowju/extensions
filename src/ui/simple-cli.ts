/**
 * Simple Interactive Calculator CLI
 * Clean, user-friendly command-line interface
 * 
 * Uses the canonical Calculator class for expression evaluation
 */

import * as readline from 'readline';
import { 
  Calculator,
  Operation,
  formatNumber,
  isOk,
  isValidNumber,
  OPERATION_SYMBOLS
} from '../calculator-canonical';

/**
 * ANSI color codes for terminal styling
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
};

interface CLIConfig {
  prompt?: string;
  showWelcome?: boolean;
  colorize?: boolean;
}

/**
 * SimpleCalculatorCLI - Interactive command-line calculator
 */
export class SimpleCalculatorCLI {
  private calc: Calculator;
  private rl: readline.Interface | null = null;
  private isRunning: boolean = false;
  private history: string[] = [];
  private config: Required<CLIConfig>;
  
  constructor(config: CLIConfig = {}) {
    this.calc = new Calculator();
    this.config = {
      prompt: config.prompt ?? 'calc> ',
      showWelcome: config.showWelcome ?? true,
      colorize: config.colorize ?? true,
    };
  }
  
  /**
   * Start the interactive calculator
   */
  start(): void {
    this.isRunning = true;
    
    if (this.config.showWelcome) {
      this.printWelcome();
    }
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    this.prompt();
  }
  
  /**
   * Stop the interactive calculator
   */
  stop(): void {
    this.isRunning = false;
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
  
  /**
   * Print welcome message
   */
  private printWelcome(): void {
    const banner = `
${this.color('cyan', '╔══════════════════════════════════════════════════════════╗')}
${this.color('cyan', '║')}  ${this.color('bright', this.color('yellow', '🔢 Simple Calculator CLI'))}                              ${this.color('cyan', '║')}
${this.color('cyan', '║')}  ${this.color('white', 'Type "help" for commands or enter expressions directly')} ${this.color('cyan', '║')}
${this.color('cyan', '╚══════════════════════════════════════════════════════════╝')}
    `;
    console.log(banner);
  }
  
  /**
   * Print help message
   */
  private printHelp(): void {
    console.log(`
${this.color('bright', '┌─────────────────────────────────────────────────────────────┐')}
${this.color('bright', '│')}                      ${this.color('yellow', 'HELP')}                                ${this.color('bright', '│')}
${this.color('bright', '└─────────────────────────────────────────────────────────────┘')}

${this.color('cyan', 'OPERATIONS:')}
  ${this.color('green', '+')}   Addition          ${this.color('green', '-')}   Subtraction
  ${this.color('green', '*')}   Multiplication    ${this.color('green', '/')}   Division
  ${this.color('green', '^')}   Power             ${this.color('green', '%')}   Modulo

${this.color('cyan', 'USAGE:')}
  Enter numbers and press operators directly:
    ${this.color('white', '10 + 5 =')}           → 15
    ${this.color('white', '25 * 4 =')}           → 100
    ${this.color('white', '2 ^ 8 =')}            → 256
    ${this.color('white', '(10 + 5) * 2 =')}     → 30

  Memory operations:
    ${this.color('yellow', 'MC')}       ${this.color('white', '-')} Clear memory
    ${this.color('yellow', 'MR')}       ${this.color('white', '-')} Recall memory
    ${this.color('yellow', 'MS')}       ${this.color('white', '-')} Store to memory
    ${this.color('yellow', 'M+')}       ${this.color('white', '-')} Add to memory
    ${this.color('yellow', 'M-')}       ${this.color('white', '-')} Subtract from memory

${this.color('cyan', 'COMMANDS:')}
  ${this.color('yellow', 'help')}     ${this.color('white', '-')} Show this help
  ${this.color('yellow', 'clear')}    ${this.color('white', '-')} Clear (reset calculator)
  ${this.color('yellow', 'history')}  ${this.color('white', '-')} Show calculation history
  ${this.color('yellow', 'state')}    ${this.color('white', '-')} Show current state
  ${this.color('yellow', 'quit')}      ${this.color('white', '-')} Exit calculator

${this.color('cyan', 'KEYBOARD SHORTCUTS:')}
  ${this.color('white', 'Ctrl+C')}      Exit immediately
  ${this.color('white', 'Ctrl+L')}      Clear screen
`);
  }
  
  /**
   * Prompt for input
   */
  private prompt(): void {
    if (!this.rl || !this.isRunning) return;
    
    this.rl.question(this.config.prompt, (input) => {
      this.handleInput(input.trim());
      this.prompt();
    });
  }
  
  /**
   * Handle user input
   */
  private handleInput(input: string): void {
    if (!input) return;
    
    const lower = input.toLowerCase();
    
    // Handle commands
    switch (lower) {
      case 'quit':
      case 'exit':
      case 'q':
        this.stop();
        console.log(this.color('green', '\n👋 Goodbye! Happy calculating!\n'));
        return;
        
      case 'help':
      case 'h':
      case '?':
        this.printHelp();
        return;
        
      case 'clear':
      case 'cls':
        this.calc.clear();
        console.log(this.color('dim', 'Calculator cleared'));
        return;
        
      case 'history':
      case 'hist':
        this.showHistory();
        return;
        
      case 'state':
        this.showState();
        return;
        
      case 'mc':
        this.calc.clearMemory();
        console.log(this.color('dim', 'Memory cleared'));
        return;
        
      case 'mr':
        this.calc.clear(); // Clear current
        this.calc.memoryRecall();
        console.log(this.color('dim', `Memory: ${this.calc.getDisplay()}`));
        return;
        
      case 'ms':
        this.calc.memoryStore();
        console.log(this.color('dim', `Stored: ${this.calc.getDisplay()}`));
        return;
        
      case 'm+':
        this.calc.memoryAdd();
        console.log(this.color('dim', 'Added to memory'));
        return;
        
      case 'm-':
        this.calc.memorySubtract();
        console.log(this.color('dim', 'Subtracted from memory'));
        return;
    }
    
    // Parse and evaluate the expression
    const result = this.parseAndEvaluate(input);
    
    if (result.success) {
      const expression = `${input} = ${formatNumber(result.value)}`;
      console.log(this.color('green', `  = ${formatNumber(result.value)}`));
      this.history.push(expression);
      console.log(this.color('dim', `  └─ ${expression}`));
    } else {
      console.log(this.color('red', `  ✗ ${result.error}`));
    }
  }
  
  /**
   * Parse input string and evaluate
   * Handles simple expressions like "10 + 5" or "25 * 4"
   */
  private parseAndEvaluate(input: string): { success: boolean; value?: number; error?: string } {
    // Tokenize input
    const tokens = this.tokenize(input);
    
    if (tokens.length === 0) {
      return { success: false, error: 'Empty expression' };
    }
    
    // Reset calculator state
    this.calc.clear();
    
    // Process tokens
    try {
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        if (typeof token === 'number') {
          // Input the number digit by digit
          const numStr = String(token);
          for (const char of numStr) {
            if (char === '.') {
              this.calc.inputDecimal();
            } else if (char === '-') {
              // Handle negative numbers
              if (i === 0 || (typeof tokens[i-1] === 'string' && ['+', '-', '*', '/', '^', '%', '('].includes(tokens[i-1] as string))) {
                // Unary minus - skip the minus and mark that we need to negate
                continue;
              }
            } else {
              this.calc.inputDigit(char);
            }
          }
        } else if (token === '=') {
          // Evaluate
          this.calc.evaluate();
        } else if (token === 'MS' || token === 'M+' || token === 'M-') {
          // Memory operations
          if (token === 'MS') this.calc.memoryStore();
          else if (token === 'M+') this.calc.memoryAdd();
          else if (token === 'M-') this.calc.memorySubtract();
        } else if (['+', '-', '*', '/', '^', '%'].includes(token)) {
          // Map symbol to operation
          const opMap: Record<string, Operation> = {
            '+': 'add',
            '-': 'subtract',
            '*': 'multiply',
            '/': 'divide',
            '^': 'power',
            '%': 'modulo',
          };
          this.calc.inputOperator(opMap[token]);
        }
      }
      
      // Get result
      const display = this.calc.getDisplay();
      const value = parseFloat(display);
      
      if (!isValidNumber(value)) {
        return { success: false, error: 'Invalid result' };
      }
      
      return { success: true, value };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }
  
  /**
   * Tokenize expression string into numbers and operators
   */
  private tokenize(expr: string): Array<number | string> {
    const tokens: Array<number | string> = [];
    let currentNum = '';
    let i = 0;
    
    // Normalize expression
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    
    while (i < expr.length) {
      const char = expr[i];
      
      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }
      
      // Check for equals sign
      if (char === '=') {
        if (currentNum) {
          tokens.push(parseFloat(currentNum));
          currentNum = '';
        }
        tokens.push('=');
        i++;
        continue;
      }
      
      // Check for operators
      if (['+', '-', '*', '/', '^', '%', 'M'].includes(char)) {
        // Handle minus as unary or binary
        if (char === '-' && (currentNum === '' || tokens.length === 0)) {
          currentNum += char;
          i++;
          continue;
        }
        
        if (currentNum) {
          tokens.push(parseFloat(currentNum));
          currentNum = '';
        }
        
        // Check for memory operations (M+, M-, MS)
        if (char === 'M') {
          const next2 = expr.slice(i, i + 2).toUpperCase();
          if (next2 === 'M+' || next2 === 'M-' || next2 === 'MS') {
            tokens.push(next2);
            i += 2;
            continue;
          }
        }
        
        tokens.push(char);
        i++;
        continue;
      }
      
      // Check for decimal point
      if (char === '.' || (char >= '0' && char <= '9')) {
        currentNum += char;
        i++;
        continue;
      }
      
      // Unknown character, skip
      i++;
    }
    
    // Add any remaining number
    if (currentNum) {
      tokens.push(parseFloat(currentNum));
    }
    
    return tokens;
  }
  
  /**
   * Show calculation history
   */
  private showHistory(): void {
    if (this.history.length === 0) {
      console.log(this.color('dim', 'No calculations in history'));
      return;
    }
    
    console.log(`\n${this.color('bright', '📜 Calculation History:')}`);
    console.log(this.color('dim', '─'.repeat(50)));
    
    this.history.forEach((entry, i) => {
      console.log(`  ${this.color('cyan', String(i + 1).padStart(2, ' '))}. ${entry}`);
    });
    
    console.log(this.color('dim', '─'.repeat(50)));
    console.log(this.color('dim', `Total: ${this.history.length} calculations\n`));
  }
  
  /**
   * Show current calculator state
   */
  private showState(): void {
    const state = this.calc.state;
    console.log(`\n${this.color('bright', '📊 Calculator State:')}`);
    console.log(this.color('dim', '─'.repeat(40)));
    console.log(`  Display:     ${this.color('white', this.calc.getDisplay())}`);
    console.log(`  Previous:    ${this.color('white', String(state.previousValue ?? 'null'))}`);
    console.log(`  Operator:   ${this.color('yellow', state.operator ? OPERATION_SYMBOLS[state.operator] : 'none')}`);
    console.log(`  Waiting:    ${state.waitingForOperand ? this.color('green', 'yes') : this.color('dim', 'no')}`);
    console.log(`  Memory:     ${this.color('cyan', formatNumber(state.memory))}`);
    console.log(`  Expression: ${this.color('dim', state.expression || '(empty)')}`);
    console.log(this.color('dim', '─'.repeat(40)) + '\n');
  }
  
  /**
   * Apply color to text if colorizing is enabled
   */
  private color(color: keyof typeof COLORS, text: string): string {
    if (!this.config.colorize) return text;
    return `${COLORS[color]}${text}${COLORS.reset}`;
  }
  
  /**
   * Get calculation history
   */
  getHistory(): string[] {
    return [...this.history];
  }
  
  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }
}

/**
 * Factory function to create CLI
 */
export function createSimpleCalculatorCLI(config?: CLIConfig): SimpleCalculatorCLI {
  return new SimpleCalculatorCLI(config);
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Run the calculator from command line
 */
function main(): void {
  const cli = new SimpleCalculatorCLI();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n' + cli.color('yellow', '👋 Interrupt received, shutting down...'));
    cli.stop();
    process.exit(0);
  });
  
  cli.start();
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default SimpleCalculatorCLI;
