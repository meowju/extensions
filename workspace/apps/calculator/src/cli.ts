/**
 * Calculator CLI
 * Usage: bun run src/cli.ts "2 + 2" or bun run src/cli.ts (REPL mode)
 */

import { calculate, CalculatorError } from './calculator.js';

function runExpression(expression: string): void {
  try {
    const result = calculate(expression);
    console.log(result);
  } catch (error) {
    if (error instanceof CalculatorError) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Error: Unknown error occurred');
    }
    process.exit(1);
  }
}

async function runRepl(): Promise<void> {
  console.log('Calculator REPL (type "exit" to quit)');
  console.log('Supported: +, -, *, /, %, ^, sqrt(), sin(), cos(), tan(), log(), PI, E');
  console.log();

  const readline = await import('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (): void => {
    rl.question('> ', (expression) => {
      const trimmed = expression.trim();
      
      if (trimmed.toLowerCase() === 'exit') {
        rl.close();
        return;
      }
      
      if (!trimmed) {
        prompt();
        return;
      }

      try {
        const result = calculate(trimmed);
        console.log(`= ${result}`);
      } catch (error) {
        if (error instanceof CalculatorError) {
          console.error(`Error: ${error.message}`);
        } else {
          console.error('Error: Unknown error occurred');
        }
      }
      
      prompt();
    });
  };

  prompt();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    await runRepl();
  } else {
    // Join all arguments as expression (allows expressions with spaces)
    const expression = args.join(' ');
    runExpression(expression);
  }
}

main().catch(console.error);