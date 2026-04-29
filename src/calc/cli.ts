/**
 * Calculator CLI
 * 
 * Command-line interface for the calculator.
 * Usage: bun run src/calc/cli.ts "<expression>"
 * Examples:
 *   bun run src/calc/cli.ts "2 + 3"
 *   bun run src/calc/cli.ts "10 * 5"
 *   bun run src/calc/cli.ts "100 / 4"
 */

import { calculateString, formatResult } from './calculator';

function main() {
  const args = Bun.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
╭─────────────────────────────────────╮
│         Simple Calculator           │
├─────────────────────────────────────┤
│  Usage: calc "<expression>"         │
│                                     │
│  Operators: + - * /                 │
│  Example: calc "2 + 3"              │
│           calc "10 * 5"             │
│           calc "100 / 4"            │
╰─────────────────────────────────────╯
`);
    return;
  }
  
  const expression = args.join(' ');
  const result = calculateString(expression);
  
  if (!result.success) {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
  
  console.log(formatResult(result.value!));
}

main();
