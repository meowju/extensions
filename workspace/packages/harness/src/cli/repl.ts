/**
 * CLI REPL Interface for Calculator
 * Interactive Read-Eval-Print Loop with keyboard support and history
 * 
 * @module cli/repl
 */

import * as readline from 'readline';
import { Calculator } from '../calculator';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** REPL configuration options */
export interface REPLConfig {
  prompt?: string;
  welcome?: string;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  enableKeyboard?: boolean;
  maxHistory?: number;
}

/** Calculation entry for history */
export interface HistoryEntry {
  expression: string;
  result: number | null;
  error: string | null;
  timestamp: Date;
}

/** Result type matching calculator */
export interface CalculationResult {
  success: boolean;
  value?: number;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PROMPT = 'calc> ';
const DEFAULT_WELCOME = `
╔════════════════════════════════════════════════════════════╗
║          TypeScript Calculator REPL v2.0                  ║
╚════════════════════════════════════════════════════════════╝

Type expressions like: 10 + 5, 25 * 4, 100 / 7
Type "help" or press Ctrl+H for commands
Type "quit" or press Ctrl+C to exit
`;

const DEFAULT_HELP = `
╔════════════════════════════════════════════════════════════╗
║                    Calculator Commands                    ║
╠════════════════════════════════════════════════════════════╣
║  EXPRESSIONS:                                             ║
║    <num> <op> <num>   Basic calculation                  ║
║    Examples: 5+3, 10*4, 100/7, 50-25                     ║
║                                                            ║
║  OPERATIONS:                                               ║
║    +, add       Addition                                  ║
║    -, sub       Subtraction                               ║
║    *, mul       Multiplication                           ║
║    /, div       Division                                  ║
║                                                            ║
║  COMMANDS:                                                ║
║    help, h      Show this help                            ║
║    clear, c     Clear screen                              ║
║    history      Show calculation history                  ║
║    clear hist   Clear history                             ║
║    state        Show calculator state                     ║
║    vars         Show stored variables                     ║
║    quit, q      Exit REPL                                 ║
║                                                            ║
║  SHORTCUTS:                                                ║
║    Ctrl+C       Quit                                      ║
║    Ctrl+H       Help                                      ║
║    Ctrl+L       Clear screen                              ║
║    Ctrl+U       Clear line                                ║
║    ↑/↓          Navigate history                          ║
║                                                            ║
║  VARIABLES:                                               ║
║    store <name> <value>  Store a variable                ║
║    recall <name>         Use stored variable              ║
║    Example: store x 10, then use: x + 5                   ║
╚════════════════════════════════════════════════════════════╝
`;

// ============================================================================
// ANSI COLOR UTILITIES
// ============================================================================

/** ANSI color codes for terminal output */
export const Colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const;

type ColorName = keyof typeof Colors;

/** Apply color to string */
function color(colorName: ColorName, text: string): string {
  return `${Colors[colorName]}${text}${Colors.reset}`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Trims whitespace and normalizes input */
function normalizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/** Formats number for display */
function formatNumber(num: number, precision: number = 10): string {
  // Handle very large or very small numbers
  if (Math.abs(num) > 1e12 || (Math.abs(num) < 1e-10 && num !== 0)) {
    return num.toExponential(precision);
  }
  
  // Round to precision and remove floating point artifacts
  const rounded = parseFloat(num.toPrecision(precision));
  
  // Format with thousands separators for readability
  if (Number.isInteger(rounded) && Math.abs(rounded) < 1e12) {
    return rounded.toLocaleString();
  }
  
  return rounded.toString();
}

// ============================================================================
// EXPRESSION PARSER
// ============================================================================

/** Token types for parsing */
type TokenType = 'number' | 'operator' | 'lparen' | 'rparen' | 'variable' | 'eof';

interface Token {
  type: TokenType;
  value: string;
}

/**
 * Tokenizes an expression string into tokens
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const expr = expression.replace(/\s+/g, '') + ' ';
  
  while (i < expr.length) {
    const char = expr[i];
    
    // Number (including decimals and negatives)
    if (/[-\d.]/.test(char)) {
      let num = '';
      if (char === '-' && (tokens.length === 0 || tokens[tokens.length - 1].type === 'operator' || tokens[tokens.length - 1].type === 'lparen')) {
        // Negative number
        i++;
        while (i < expr.length && /[\d.]/.test(expr[i])) {
          num += expr[i];
          i++;
        }
        tokens.push({ type: 'number', value: num ? `-${num}` : '-' });
        continue;
      }
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }
    
    // Operators
    if ('+-*/^'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }
    
    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'rparen', value: ')' });
      i++;
      continue;
    }
    
    // Variable (letter followed by optional letters/digits)
    if (/[a-zA-Z]/.test(char)) {
      let varName = '';
      while (i < expr.length && /[a-zA-Z0-9]/.test(expr[i])) {
        varName += expr[i];
        i++;
      }
      tokens.push({ type: 'variable', value: varName });
      continue;
    }
    
    // Skip unknown characters
    i++;
  }
  
  tokens.push({ type: 'eof', value: '' });
  return tokens;
}

/** Normalizes operation aliases to core operators */
function normalizeOp(op: string): string {
  const map: Record<string, string> = {
    'add': '+',
    'sub': '-',
    'mul': '*',
    'div': '/',
    'subtract': '-',
    'multiply': '*',
    'divide': '/',
    'plus': '+',
    'minus': '-',
    'times': '*',
    'x': '*',
    'X': '*',
  };
  return map[op.toLowerCase()] ?? op;
}

/**
 * Parsed expression result
 */
export interface ParsedExpression {
  operand1: number;
  operand2: number;
  operator: string;
  raw: string;
}

/**
 * Parses user input into a structured expression
 */
export function parseExpression(input: string, variables: Map<string, number>): ParsedExpression | null {
  const normalized = normalizeInput(input);
  
  // Tokenize the expression
  const tokens = tokenize(normalized);
  
  if (tokens.length < 3) {
    return null;
  }
  
  // Simple binary expression parser
  let operand1: number | null = null;
  let operator: string | null = null;
  let operand2: number | null = null;
  let i = 0;
  
  // Parse first operand
  if (tokens[i].type === 'number') {
    operand1 = parseFloat(tokens[i].value);
  } else if (tokens[i].type === 'variable') {
    const varVal = variables.get(tokens[i].value.toLowerCase());
    if (varVal === undefined) return null;
    operand1 = varVal;
  } else if (tokens[i].type === 'lparen') {
    // Handle (expr) as operand - find matching paren
    let parenDepth = 1;
    let j = i + 1;
    while (j < tokens.length && parenDepth > 0) {
      if (tokens[j].type === 'lparen') parenDepth++;
      if (tokens[j].type === 'rparen') parenDepth--;
      j++;
    }
    // Simple parenthesized number - extract it
    if (j - i === 3 && tokens[i + 1].type === 'number') {
      operand1 = parseFloat(tokens[i + 1].value);
    }
  }
  i++;
  
  // Parse operator
  if (i < tokens.length && tokens[i].type === 'operator') {
    operator = normalizeOp(tokens[i].value);
    i++;
  }
  
  // Parse second operand
  if (i < tokens.length && operand1 !== null) {
    if (tokens[i].type === 'number') {
      operand2 = parseFloat(tokens[i].value);
    } else if (tokens[i].type === 'variable') {
      const varVal = variables.get(tokens[i].value.toLowerCase());
      if (varVal === undefined) return null;
      operand2 = varVal;
    }
  }
  
  if (operand1 === null || operator === null || operand2 === null) {
    return null;
  }
  
  return { operand1, operand2, operator, raw: normalized };
}

// ============================================================================
// CALCULATOR REPL CLASS
// ============================================================================

/**
 * Interactive REPL for calculator operations
 */
export class REPL {
  private prompt: string;
  private calculator: Calculator;
  private history: HistoryEntry[] = [];
  private variables: Map<string, number> = new Map();
  private currentLine: string = '';
  private maxHistory: number;
  private isRunning: boolean = false;
  private rl: readline.Interface | null = null;
  
  // Config
  private inputStream: NodeJS.ReadableStream;
  private outputStream: NodeJS.WritableStream;
  private enableKeyboard: boolean;
  
  constructor(config: REPLConfig = {}) {
    this.prompt = config.prompt ?? DEFAULT_PROMPT;
    this.maxHistory = config.maxHistory ?? 100;
    this.inputStream = config.input ?? process.stdin;
    this.outputStream = config.output ?? process.stdout;
    this.enableKeyboard = config.enableKeyboard ?? true;
    this.calculator = new Calculator();
  }
  
  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------
  
  /** Starts the REPL */
  async start(): Promise<void> {
    this.isRunning = true;
    this.outputStream.write(DEFAULT_WELCOME + '\n');
    
    this.rl = readline.createInterface({
      input: this.inputStream,
      output: this.outputStream,
      completer: this.completer.bind(this),
    });
    
    // Enable keyboard mode if supported
    if (this.enableKeyboard && this.inputStream.isTTY) {
      (this.inputStream as NodeJS.ReadableStream & { setRawMode?: (mode: boolean) => void }).setRawMode?.(true);
    }
    
    this.promptUser();
  }
  
  /** Stops the REPL */
  stop(): void {
    this.isRunning = false;
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
  
  /** Resets the calculator state */
  reset(): void {
    this.calculator.clear();
    this.outputStream.write(color('cyan', '🔄 Calculator reset\n'));
  }
  
  /** Gets calculation history */
  getHistory(): HistoryEntry[] {
    return [...this.history];
  }
  
  /** Clears calculation history */
  clearHistory(): void {
    this.history = [];
    this.outputStream.write(color('cyan', '📋 History cleared\n'));
  }
  
  /** Gets stored variables */
  getVariables(): Map<string, number> {
    return new Map(this.variables);
  }
  
  /** Evaluates an expression (for programmatic use) */
  evaluate(expression: string): CalculationResult {
    const parsed = parseExpression(expression, this.variables);
    
    if (!parsed) {
      return { success: false, error: 'Invalid expression format' };
    }
    
    // Map string operator to Calculator operation
    const opMap: Record<string, string> = {
      '+': 'add',
      '-': 'subtract',
      '*': 'multiply',
      '/': 'divide',
    };
    
    const op = opMap[parsed.operator];
    if (!op) {
      return { success: false, error: `Unknown operator: ${parsed.operator}` };
    }
    
    try {
      const result = this.calculator.execute(op as 'add' | 'subtract' | 'multiply' | 'divide', parsed.operand1, parsed.operand2);
      return { success: true, value: result.value };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation failed',
      };
    }
  }
  
  /** Gets current calculator state */
  getState() {
    return this.calculator.state;
  }
  
  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------
  
  /** Prompts user for input */
  private promptUser(): void {
    if (!this.rl || !this.isRunning) return;
    
    this.rl.question(this.prompt, (input) => {
      this.processInput(input);
      if (this.isRunning) {
        this.promptUser();
      }
    });
  }
  
  /** Processes user input */
  private processInput(input: string): void {
    const trimmed = input.trim();
    
    // Add to history for navigation
    if (trimmed.length > 0) {
      this.addToHistory(trimmed);
    }
    
    this.currentLine = '';
    
    // Handle empty input
    if (trimmed.length === 0) {
      return;
    }
    
    // Parse command or expression
    const lower = trimmed.toLowerCase();
    const parts = lower.split(/\s+/);
    const cmd = parts[0];
    
    // Check for commands
    if (this.handleCommand(trimmed, parts, cmd)) {
      return;
    }
    
    // Try to evaluate as expression
    const result = this.evaluate(trimmed);
    
    if (result.success) {
      const formatted = this.formatResult(result.value!);
      this.outputStream.write(
        color('green', `✅ ${formatted}\n`)
      );
      
      // Store last result for convenience
      this.variables.set('ans', result.value!);
      
      // Add to history
      this.history.push({
        expression: trimmed,
        result: result.value!,
        error: null,
        timestamp: new Date(),
      });
    } else {
      this.outputStream.write(
        color('red', `❌ ${result.error}\n`)
      );
    }
  }
  
  /** Handles built-in commands */
  private handleCommand(input: string, parts: string[], cmd: string): boolean {
    switch (cmd) {
      case 'help':
      case 'h':
      case '?':
        this.outputStream.write(DEFAULT_HELP + '\n');
        return true;
        
      case 'quit':
      case 'exit':
      case 'q':
        this.stop();
        this.outputStream.write(
          color('magenta', '\n👋 Goodbye! Thanks for calculating!\n')
        );
        return true;
        
      case 'clear':
      case 'cls':
        this.outputStream.write('\x1b[2J\x1b[H'); // ANSI clear
        return true;
        
      case 'history':
      case 'hist':
        this.showHistory();
        return true;
        
      case 'clearhistory':
      case 'clear hist':
        this.clearHistory();
        return true;
        
      case 'state':
        this.showState();
        return true;
        
      case 'vars':
      case 'variables':
        this.showVariables();
        return true;
        
      case 'store':
      case 'save':
        this.handleStore(parts);
        return true;
        
      case 'recall':
      case 'load':
        this.handleRecall(parts);
        return true;
        
      case 'del':
      case 'delete':
        this.handleDelete(parts);
        return true;
        
      case 'reset':
        this.reset();
        return true;
        
      case 'ans':
        // Show last result
        const lastResult = this.variables.get('ans');
        if (lastResult !== undefined) {
          this.outputStream.write(
            color('cyan', `Last result: ${formatNumber(lastResult)}\n`)
          );
        } else {
          this.outputStream.write(
            color('yellow', 'No result in memory\n')
          );
        }
        return true;
    }
    
    return false;
  }
  
  /** Shows calculation history */
  private showHistory(): void {
    if (this.history.length === 0) {
      this.outputStream.write(
        color('yellow', '📋 No calculations in history\n')
      );
      return;
    }
    
    this.outputStream.write(color('cyan', '\n📋 Calculation History:\n'));
    this.outputStream.write('─'.repeat(50) + '\n');
    
    this.history.forEach((entry, i) => {
      const time = entry.timestamp.toLocaleTimeString();
      if (entry.error) {
        this.outputStream.write(
          `  ${String(i + 1).padStart(2)}. ${entry.expression} → ${color('red', 'ERROR: ' + entry.error)}\n`
        );
      } else if (entry.result !== null) {
        this.outputStream.write(
          `  ${String(i + 1).padStart(2)}. ${entry.expression} = ${color('green', formatNumber(entry.result))}\n`
        );
      }
    });
    
    this.outputStream.write('─'.repeat(50) + '\n');
  }
  
  /** Shows calculator state */
  private showState(): void {
    const state = this.calculator.state;
    this.outputStream.write(color('cyan', '\n🔢 Calculator State:\n'));
    this.outputStream.write('─'.repeat(30) + '\n');
    this.outputStream.write(`  Current Value: ${color('bold', state.currentValue)}\n`);
    this.outputStream.write(`  Previous Value: ${state.previousValue ?? 'None'}\n`);
    this.outputStream.write(`  Operator: ${state.operator ?? 'None'}\n`);
    this.outputStream.write(`  Expression: ${state.expression || '(empty)'}\n`);
    this.outputStream.write(`  Error: ${state.hasError ? color('red', 'Yes') : color('green', 'No')}\n`);
    this.outputStream.write('─'.repeat(30) + '\n');
  }
  
  /** Shows stored variables */
  private showVariables(): void {
    if (this.variables.size === 0) {
      this.outputStream.write(
        color('yellow', '📊 No variables stored\n')
      );
      return;
    }
    
    this.outputStream.write(color('cyan', '\n📊 Stored Variables:\n'));
    this.outputStream.write('─'.repeat(30) + '\n');
    
    for (const [name, value] of this.variables) {
      this.outputStream.write(`  ${color('yellow', name.padEnd(10))} = ${formatNumber(value)}\n`);
    }
    
    this.outputStream.write('─'.repeat(30) + '\n');
  }
  
  /** Handles store command */
  private handleStore(parts: string[]): void {
    if (parts.length < 3) {
      this.outputStream.write(
        color('yellow', 'Usage: store <name> <value>\n')
      );
      return;
    }
    
    const name = parts[1].toLowerCase();
    const value = parseFloat(parts[2]);
    
    if (isNaN(value)) {
      this.outputStream.write(
        color('red', 'Invalid number\n')
      );
      return;
    }
    
    this.variables.set(name, value);
    this.outputStream.write(
      color('green', `✅ Stored ${name} = ${formatNumber(value)}\n`)
    );
  }
  
  /** Handles recall command */
  private handleRecall(parts: string[]): void {
    if (parts.length < 2) {
      this.outputStream.write(
        color('yellow', 'Usage: recall <name>\n')
      );
      return;
    }
    
    const name = parts[1].toLowerCase();
    const value = this.variables.get(name);
    
    if (value === undefined) {
      this.outputStream.write(
        color('red', `Variable "${name}" not found\n`)
      );
      return;
    }
    
    this.outputStream.write(
      color('cyan', `${name} = ${formatNumber(value)}\n`)
    );
  }
  
  /** Handles delete command */
  private handleDelete(parts: string[]): void {
    if (parts.length < 2) {
      this.outputStream.write(
        color('yellow', 'Usage: del <name>\n')
      );
      return;
    }
    
    const name = parts[1].toLowerCase();
    
    if (this.variables.has(name)) {
      this.variables.delete(name);
      this.outputStream.write(
        color('green', `✅ Deleted variable "${name}"\n`)
      );
    } else {
      this.outputStream.write(
        color('yellow', `Variable "${name}" not found\n`)
      );
    }
  }
  
  /** Formats result for display */
  private formatResult(value: number): string {
    return formatNumber(value);
  }
  
  /** Adds input to history */
  private addToHistory(input: string): void {
    // Don't add duplicates
    if (this.history.length > 0 && this.history[0].expression === input) {
      return;
    }
    
    this.history.unshift({
      expression: input,
      result: null,
      error: null,
      timestamp: new Date(),
    });
    
    // Trim history if needed
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }
  
  /** Auto-completion for readline */
  private completer(line: string): [string[], string] {
    const commands = [
      'help', 'h', '?',
      'quit', 'exit', 'q',
      'clear', 'cls',
      'history', 'hist',
      'clear history',
      'state',
      'vars', 'variables',
      'store', 'save',
      'recall', 'load',
      'del', 'delete',
      'reset',
      'ans',
    ];
    
    const hits = commands.filter((cmd) => cmd.startsWith(line.toLowerCase()));
    return [hits.length ? hits : [], line];
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a new REPL instance with default settings
 */
export function createREPL(config?: REPLConfig): REPL {
  return new REPL(config);
}

/**
 * Runs a single calculation from command line arguments
 */
export function runFromArgs(args: string[]): string | null {
  if (args.length < 3) {
    return null;
  }
  
  const [, arg1, op, arg2] = args;
  const expression = `${arg1} ${op} ${arg2}`;
  const repl = new REPL({ enableKeyboard: false });
  const result = repl.evaluate(expression);
  
  if (result.success) {
    return formatNumber(result.value!);
  }
  
  return `Error: ${result.error}`;
}

/**
 * Runs the REPL with command line arguments
 * If args provided, runs single calculation
 * Otherwise starts interactive REPL
 */
export async function run(args: string[]): Promise<void> {
  if (args.length >= 3) {
    // Single calculation mode
    const result = runFromArgs(args);
    if (result) {
      console.log(result);
    } else {
      console.error('Usage: calculator <num1> <op> <num2>');
    }
  } else {
    // Interactive REPL mode
    const repl = new REPL();
    await repl.start();
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default REPL;