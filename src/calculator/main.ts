/**
 * Calculator CLI Interface
 * Interactive command-line calculator with expression parsing and input handling
 * 
 * Features:
 * - Interactive REPL mode with readline
 * - Non-interactive/piped input mode
 * - Full expression parsing (infix notation)
 * - History support via up/down arrows
 * - Multiple operations: +, -, *, /, ^, !
 * - Parentheses support
 * - Memory operations
 */

import * as readline from 'readline';
import { 
  Calculator, 
  evaluateExpression, 
  validateExpression,
  CalculatorStateManager,
  INITIAL_STATE 
} from './index.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * CLI configuration options
 */
interface CLIOptions {
  greeting?: boolean;
  precision?: number;
  historySize?: number;
}

/**
 * Command result type
 */
interface CommandResult {
  success: boolean;
  message: string;
  isQuit?: boolean;
  isHelp?: boolean;
  isClear?: boolean;
}

/**
 * Parsed expression result
 */
interface ParsedExpression {
  expression: string;
  result: number;
  timestamp: number;
}

// ============================================================================
// ANSI Color Codes for Terminal Output
// ============================================================================

const Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  success: '\x1b[32m',
  error: '\x1b[31m',
  warning: '\x1b[33m',
};

/**
 * Clear line and move cursor up
 */
function clearLine(): void {
  process.stdout.write('\r\x1b[K');
}

/**
 * Print colored output
 */
function print(text: string, color?: string): void {
  if (color) {
    process.stdout.write(`${color}${text}${Colors.reset}`);
  } else {
    process.stdout.write(text);
  }
}

/**
 * Print line with optional color
 */
function println(text: string, color?: string): void {
  print(text + '\n', color);
}

// ============================================================================
// Calculator CLI Implementation
// ============================================================================

export class CalculatorCLI {
  private state: CalculatorStateManager;
  private history: ParsedExpression[] = [];
  private historyIndex: number = -1;
  private rl: readline.Interface | null = null;
  private isRunning: boolean = false;
  private options: Required<CLIOptions>;
  private currentInput: string = '';

  constructor(options: CLIOptions = {}) {
    this.options = {
      greeting: true,
      precision: 10,
      historySize: 50,
      ...options,
    };
    this.state = new CalculatorStateManager();
  }

  // ===========================================================================
  // Display Methods
  // ===========================================================================

  /**
   * Clear the terminal screen
   */
  clearScreen(): void {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  /**
   * Show welcome banner
   */
  private showWelcome(): void {
    println('');
    println('╔════════════════════════════════════════════════════════╗', Colors.cyan);
    println('║              CALCULATOR CLI v1.0                       ║', Colors.cyan);
    println('╠════════════════════════════════════════════════════════╣', Colors.cyan);
    println('║  A powerful expression calculator with memory         ║', Colors.cyan);
    println('╚════════════════════════════════════════════════════════╝', Colors.cyan);
    println('');
  }

  /**
   * Show help message
   */
  showHelp(): void {
    println('');
    println('╔════════════════════════════════════════════════════════╗', Colors.yellow);
    println('║                     HELP                               ║', Colors.yellow);
    println('╠════════════════════════════════════════════════════════╣', Colors.yellow);
    println('║                                                        ║', Colors.yellow);
    println('║  USAGE:                                               ║', Colors.yellow);
    println('║    Enter mathematical expressions to evaluate          ║', Colors.yellow);
    println('║    Examples:                                           ║', Colors.yellow);
    println('║      10 + 5          (addition)                        ║', Colors.yellow);
    println('║      20 - 8          (subtraction)                     ║', Colors.yellow);
    println('║      6 * 7           (multiplication)                  ║', Colors.yellow);
    println('║      100 / 4         (division)                       ║', Colors.yellow);
    println('║      2 ^ 8           (power/exponent)                  ║', Colors.yellow);
    println('║      5!              (factorial)                      ║', Colors.yellow);
    println('║      (2 + 3) * 4     (parentheses)                    ║', Colors.yellow);
    println('║                                                        ║', Colors.yellow);
    println('║  COMMANDS:                                            ║', Colors.yellow);
    println('║    help, h        - Show this help message            ║', Colors.yellow);
    println('║    clear, cls     - Clear the screen                  ║', Colors.yellow);
    println('║    history, hist  - Show calculation history          ║', Colors.yellow);
    println('║    memory, mem    - Show memory value                 ║', Colors.yellow);
    println('║    quit, exit, q  - Exit the calculator               ║', Colors.yellow);
    println('║                                                        ║', Colors.yellow);
    println('║  KEYBOARD SHORTCUTS:                                  ║', Colors.yellow);
    println('║    Up/Down        - Navigate command history          ║', Colors.yellow);
    println('║    Ctrl+C         - Exit calculator                   ║', Colors.yellow);
    println('║    Ctrl+L         - Clear screen                      ║', Colors.yellow);
    println('║                                                        ║', Colors.yellow);
    println('╚════════════════════════════════════════════════════════╝', Colors.yellow);
    println('');
  }

  /**
   * Show memory value
   */
  showMemory(): void {
    const memory = this.state.get('memory');
    if (memory !== 0) {
      println(`Memory: ${this.formatNumber(memory)}`, Colors.magenta);
    } else {
      println('Memory: 0 (empty)', Colors.gray);
    }
  }

  /**
   * Show calculation history
   */
  showHistory(): void {
    println('');
    if (this.history.length === 0) {
      println('No history yet.', Colors.gray);
    } else {
      println('╔════════════════════════════════════════════════════════╗', Colors.blue);
      println('║                   HISTORY                               ║', Colors.blue);
      println('╠════════════════════════════════════════════════════════╣', Colors.blue);
      
      const start = Math.max(0, this.history.length - 10);
      for (let i = this.history.length - 1; i >= start; i--) {
        const entry = this.history[i];
        println(`  ${i + 1}.  ${entry.expression} = ${this.formatNumber(entry.result)}`, Colors.blue);
      }
      
      println('╚════════════════════════════════════════════════════════╝', Colors.blue);
    }
    println('');
  }

  /**
   * Format number for display
   */
  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return 'Error';
    }
    
    // Use precision formatting
    const formatted = value.toPrecision(this.options.precision);
    
    // Parse back to remove trailing zeros
    const parsed = parseFloat(formatted);
    
    // For very large or very small numbers, use scientific notation
    if (Math.abs(parsed) >= 1e10 || (parsed !== 0 && Math.abs(parsed) < 1e-6)) {
      return parsed.toExponential(this.options.precision - 1);
    }
    
    return parsed.toString();
  }

  // ===========================================================================
  // Input Processing
  // ===========================================================================

  /**
   * Process user input and return result
   */
  processInput(input: string): CommandResult {
    const trimmed = input.trim();
    this.currentInput = trimmed;

    // Empty input
    if (trimmed === '') {
      return { success: true, message: '' };
    }

    // Normalize to lowercase for command matching
    const normalized = trimmed.toLowerCase();

    // Handle quit commands
    if (normalized === 'quit' || normalized === 'exit' || normalized === 'q') {
      return { success: true, message: 'Goodbye!', isQuit: true };
    }

    // Handle help commands
    if (normalized === 'help' || normalized === 'h' || normalized === '?') {
      return { success: true, message: '', isHelp: true };
    }

    // Handle clear commands
    if (normalized === 'clear' || normalized === 'cls' || normalized === 'ctrl+l') {
      return { success: true, message: '', isClear: true };
    }

    // Handle history command
    if (normalized === 'history' || normalized === 'hist' || normalized === 'history()') {
      return { success: true, message: '', showHistory: true };
    }

    // Handle memory command
    if (normalized === 'memory' || normalized === 'mem' || normalized === 'memory()') {
      const mem = this.state.get('memory');
      return { success: true, message: `Memory: ${this.formatNumber(mem)}` };
    }

    // Handle memory clear
    if (normalized === 'mc' || normalized === 'mem clear') {
      this.state.set('memory', 0);
      return { success: true, message: 'Memory cleared' };
    }

    // Handle memory operations
    if (normalized.startsWith('m+') || normalized === 'm+') {
      const lastResult = this.history.length > 0 ? this.history[this.history.length - 1].result : 0;
      this.state.set('memory', this.state.get('memory') + lastResult);
      return { success: true, message: `Added to memory: ${this.formatNumber(this.state.get('memory'))}` };
    }

    if (normalized.startsWith('m-') || normalized === 'm-') {
      const lastResult = this.history.length > 0 ? this.history[this.history.length - 1].result : 0;
      this.state.set('memory', this.state.get('memory') - lastResult);
      return { success: true, message: `Subtracted from memory: ${this.formatNumber(this.state.get('memory'))}` };
    }

    // Handle memory recall
    if (normalized === 'mr' || normalized === 'mem recall' || normalized === 'memr') {
      const mem = this.state.get('memory');
      return { success: true, message: `Memory recall: ${this.formatNumber(mem)}` };
    }

    // Handle memory store (MS)
    if (normalized === 'ms' || normalized === 'mem store') {
      return { success: true, message: 'Use "=<expression>" to store result to memory' };
    }

    // Handle store to memory (e.g., "5+3 -> mem" or just use M+ after calculation)
    if (normalized.includes('->') || normalized.includes('to mem')) {
      const expr = normalized.replace(/to mem|-> mem|->/g, '').trim();
      if (expr) {
        const result = evaluateExpression(expr);
        if (result.success) {
          this.state.set('memory', result.value);
          return { success: true, message: `Stored ${this.formatNumber(result.value)} to memory` };
        } else {
          return { success: false, message: `Error: ${result.error}` };
        }
      }
    }

    // Validate expression syntax before evaluation
    const validation = validateExpression(trimmed);
    if (!validation.valid) {
      return { success: false, message: `Syntax error: ${validation.error}` };
    }

    // Evaluate the expression
    const result = evaluateExpression(trimmed);

    if (result.success) {
      // Add to history
      this.history.push({
        expression: trimmed,
        result: result.value,
        timestamp: Date.now(),
      });

      // Trim history if needed
      if (this.history.length > this.options.historySize) {
        this.history = this.history.slice(-this.options.historySize);
      }

      // Reset history navigation index after new input
      this.historyIndex = -1;

      return { 
        success: true, 
        message: `${trimmed} = ${this.formatNumber(result.value)}` 
      };
    } else {
      return { 
        success: false, 
        message: `Error: ${result.error}` 
      };
    }
  }

  /**
   * Get previous command from history
   */
  getPreviousCommand(): string {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
    }
    
    if (this.history.length > 0 && this.historyIndex >= 0) {
      // Reverse order: most recent first
      const reversedIndex = this.history.length - 1 - this.historyIndex;
      return this.history[reversedIndex].expression;
    }
    
    return '';
  }

  /**
   * Get next command from history
   */
  getNextCommand(): string {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const reversedIndex = this.history.length - 1 - this.historyIndex;
      return this.history[reversedIndex].expression;
    }
    
    this.historyIndex = -1;
    return '';
  }

  /**
   * Reset history navigation index
   */
  resetHistoryIndex(): void {
    this.historyIndex = -1;
  }

  // ===========================================================================
  // REPL Implementation
  // ===========================================================================

  /**
   * Create readline interface
   */
  private createReadline(): readline.Interface {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: this.completer.bind(this),
      prompt: 'calc> ',
    });
  }

  /**
   * Auto-complete suggestions
   */
  private completer(line: string): [string[], string] {
    const commands = [
      'help', 'h', 'quit', 'exit', 'q', 
      'clear', 'cls', 'history', 'hist',
      'memory', 'mem', 'mc', 'mr', 'ms',
      'm+', 'm-',
    ];

    const operations = ['+', '-', '*', '/', '^', '!', '(', ')'];
    const keywords = ['to mem', '->'];

    const choices = [...commands, ...operations, ...keywords];
    const hits = choices.filter((c) => c.startsWith(line.toLowerCase()));

    return [hits.length ? hits : [], line];
  }

  /**
   * Display prompt with optional coloring
   */
  private displayPrompt(): void {
    print('calc> ', Colors.green);
  }

  /**
   * Display result message
   */
  private displayResult(result: CommandResult): void {
    if (result.isQuit) {
      println(`\n${Colors.cyan}Goodbye! Thanks for using the calculator.${Colors.reset}\n`);
      return;
    }

    if (result.isHelp) {
      this.showHelp();
      return;
    }

    if (result.isClear) {
      this.clearScreen();
      return;
    }

    if (result.showHistory) {
      this.showHistory();
      return;
    }

    if (result.message) {
      if (result.success) {
        println(`  ${result.message}`, Colors.green);
      } else {
        println(`  ${result.message}`, Colors.red);
      }
    }
  }

  /**
   * Handle individual input line
   */
  private handleLine(input: string): void {
    const result = this.processInput(input);
    this.displayResult(result);
    
    if (result.isQuit) {
      this.stop();
    }
  }

  // ===========================================================================
  // Public Interface
  // ===========================================================================

  /**
   * Start the interactive calculator REPL
   */
  start(): void {
    if (this.isRunning) {
      println('Calculator is already running.', Colors.warning);
      return;
    }

    this.isRunning = true;
    this.rl = this.createReadline();

    if (this.options.greeting) {
      this.showWelcome();
      println('Enter an expression or command (type "help" for options):', Colors.gray);
    }

    // Handle Ctrl+C gracefully
    this.rl.on('close', () => {
      if (this.isRunning) {
        println('\n\nUse "quit" or "exit" to close the calculator.', Colors.gray);
        this.start(); // Restart the REPL
      }
    });

    // Set up custom input handling for arrow keys
    const inputHandler = (input: string) => {
      this.handleLine(input);
      this.displayPrompt();
    };

    this.rl.on('line', inputHandler);

    // Handle Ctrl+C for immediate exit
    process.on('SIGINT', () => {
      println('\n\nInterrupted. Use "quit" to exit.', Colors.yellow);
      this.displayPrompt();
    });

    this.displayPrompt();
  }

  /**
   * Stop the calculator
   */
  stop(): void {
    this.isRunning = false;
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * Check if calculator is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current state
   */
  getState() {
    return this.state.getState();
  }

  /**
   * Get calculation history
   */
  getHistory(): ParsedExpression[] {
    return [...this.history];
  }

  /**
   * Clear calculation history
   */
  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
  }
}

// Add missing property to CommandResult interface
interface CommandResult {
  showHistory?: boolean;
}

// ============================================================================
// Non-Interactive Mode (Piped Input)
// ============================================================================

/**
 * Run calculator in non-interactive mode (for piping/input redirection)
 */
function runNonInteractive(input: string): void {
  const cli = new CalculatorCLI({ greeting: false });
  const lines = input.trim().split('\n');

  for (const line of lines) {
    if (line.trim() === '') continue;

    const result = cli.processInput(line);

    if (result.isQuit) {
      break;
    }

    if (result.message) {
      println(result.message, result.success ? Colors.green : Colors.red);
    }
  }
}

/**
 * Run single expression from command line arguments
 */
function runSingleExpression(expr: string): void {
  const cli = new CalculatorCLI({ greeting: false });
  const result = cli.processInput(expr);

  if (result.message) {
    println(result.message, result.success ? Colors.green : Colors.red);
    process.exit(result.success ? 0 : 1);
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main function - entry point for the calculator CLI
 */
function main(): void {
  const args = process.argv.slice(2);

  // Check for single expression argument (non-interactive)
  if (args.length === 1 && !args[0].startsWith('-')) {
    runSingleExpression(args[0]);
    return;
  }

  // Check for --help flag
  if (args.includes('--help') || args.includes('-h')) {
    const cli = new CalculatorCLI({ greeting: false });
    cli.showHelp();
    println('Usage: npx ts-node src/calculator/main.ts [expression]');
    println('       echo "2 + 2" | npx ts-node src/calculator/main.ts');
    println('');
    return;
  }

  // Check for piped input (non-TTY)
  if (!process.stdin.isTTY) {
    let buffer = '';
    
    process.stdin.on('data', (chunk) => {
      buffer += chunk.toString();
    });

    process.stdin.on('end', () => {
      runNonInteractive(buffer);
    });

    return;
  }

  // Start interactive REPL
  const cli = new CalculatorCLI();
  cli.start();
}

// ============================================================================
// Export for Testing and Reuse
// ============================================================================

export { runNonInteractive, runSingleExpression };
export default CalculatorCLI;

// ============================================================================
// Run Main Function
// ============================================================================

// Only run main() if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
