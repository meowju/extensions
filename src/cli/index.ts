/**
 * CLI Entry Point
 * Main executable for the calculator REPL
 */

import { REPL, createREPL } from './repl';

// ============================================================================
// COMMAND LINE INTERFACE
// ============================================================================

/** CLI configuration from command line arguments */
interface CLIOptions {
  help: boolean;
  version: boolean;
  expression?: string;
  prompt?: string;
  noColor: boolean;
  maxHistory: number;
}

/**
 * Parses command line arguments into options
 */
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    help: false,
    version: false,
    noColor: false,
    maxHistory: 100,
  };
  
  const skipFlags = ['node', 'calculator', 'calculator.js', 'calculator.mjs'];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    
    // Skip known executable paths
    if (skipFlags.includes(arg)) continue;
    
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
        
      case '-v':
      case '--version':
        options.version = true;
        break;
        
      case '-p':
      case '--prompt':
        options.prompt = args[++i];
        break;
        
      case '--no-color':
        options.noColor = true;
        break;
        
      case '-n':
      case '--max-history':
        const nextArg = args[++i];
        if (nextArg !== undefined) {
          options.maxHistory = parseInt(nextArg, 10);
        }
        break;
        
      default:
        // If not a flag, treat as expression
        if (arg && !arg.startsWith('-')) {
          options.expression = arg;
        }
        break;
    }
  }
  
  return options;
}

/**
 * Displays help message
 */
function showHelp(): void {
  console.log(`
TypeScript Calculator CLI v2.0
A feature-rich REPL for arithmetic calculations

USAGE:
  calculator [OPTIONS] [EXPRESSION]
  
OPTIONS:
  -h, --help          Show this help message
  -v, --version      Show version information
  -p, --prompt STR   Set custom prompt (default: "calc> ")
  -n, --max-history N Set maximum history entries (default: 100)
  --no-color          Disable colored output
  
EXPRESSION:
  If provided, evaluates the expression and exits.
  Otherwise, starts interactive REPL mode.
  
  Format: <num1> <op> <num2>
  
  Examples:
    calculator 10 + 5
    calculator 25 * 4
    calculator 100 / 7
    
  Supported operations:
    + add      Addition
    - sub      Subtraction
    * mul      Multiplication
    / div      Division

REPL COMMANDS:
  help, h              Show help
  quit, q              Exit REPL
  clear, cls           Clear screen
  history, hist        Show calculation history
  clear history        Clear history
  state                Show calculator state
  vars                 Show stored variables
  store <n> <v>        Store a variable
  recall <n>           Recall a variable
  del <n>              Delete a variable
  reset                Reset calculator
  ans                  Show last result
`);
}

/**
 * Displays version information
 */
function showVersion(): void {
  console.log('TypeScript Calculator CLI v2.0.0');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(process.env.NODE_DEBUG ? 2 : 2);
  const options = parseArgs(args);
  
  // Handle help
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  // Handle version
  if (options.version) {
    showVersion();
    process.exit(0);
  }
  
  // Single expression mode
  if (options.expression) {
    const repl = createREPL({
      prompt: options.prompt,
      maxHistory: options.maxHistory,
      enableKeyboard: false,
    });
    
    const result = repl.evaluate(options.expression);
    
    if (result.success) {
      console.log(result.value);
      process.exit(0);
    } else {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  }
  
  // Interactive REPL mode
  const repl = createREPL({
    prompt: options.prompt ?? 'calc> ',
    maxHistory: options.maxHistory,
    enableKeyboard: true,
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Goodbye!\n');
    repl.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    repl.stop();
    process.exit(0);
  });
  
  // Start the REPL
  await repl.start();
}

// ============================================================================
// EXPORTS
// ============================================================================

export { parseArgs, showHelp, showVersion, main };
export type { CLIOptions };

export interface CliTransport {
  close: () => Promise<void>;
}

export function createCliTransport(dispatcher: any): CliTransport {
  const repl = createREPL({ enableKeyboard: true });
  repl.start();
  return {
    close: async () => {
      repl.stop();
    }
  };
}

// Run if executed directly
// Using a safe check for require.main
if (typeof require !== 'undefined' && require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}