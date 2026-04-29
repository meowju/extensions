/**
 * tui.ts - Minimal turn-based TUI
 *
 * Replaces 203-line tui.ts with simple line-based I/O
 */
import * as readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";

const PROMPT = "ฅ(^•ﻌ•^)ฅ MEOW > ";
const R = "\x1b[0m";
const G = "\x1b[32m";
const Y = "\x1b[33m";
const R_ERR = "\x1b[31m";

export interface TUI {
  clear(): void;
  printUser(text: string): void;
  printAssistant(text: string): void;
  printToolCall(tool: string, args: string): void;
  printToolResult(text: string): void;
  printError(text: string): void;
  printSuccess(text: string): void;
  printInfo(text: string): void;
  printWarning(text: string): void;
  startThinking(): void;
  stopThinking(): void;
  setStatus(info: { mode?: string; tokens?: number; dangerous?: boolean }): void;
  printHeader(): void;
  printStatusBar(): void;
  destroy(): void;
}

export function createTUI(): TUI {
  return {
    clear() { process.stdout.write("\x1b[2J\x1b[H"); },
    printUser(text: string) { console.log(`\nYou: ${text}`); },
    printAssistant(text: string) { console.log(`\nMeow: ${text}`); },
    printToolCall(tool: string, args: string) { console.log(`\n[Y][${tool}] ${args.slice(0, 80)}`); },
    printToolResult(text: string) { console.log(`  --> ${text.slice(0, 200)}`); },
    printError(text: string) { console.log(`\n[X] ${text}`); },
    printSuccess(text: string) { console.log(`[OK] ${text}`); },
    printInfo(text: string) { console.log(`[i] ${text}`); },
    printWarning(text: string) { console.log(`[!] ${text}`); },
    startThinking() { process.stdout.write("thinking... "); },
    stopThinking() { console.log("done"); },
    setStatus(info) { /* minimal: no-op */ },
    printHeader() { console.log("ฅ(^•ﻌ•^)ฅ MEOW"); },
    printStatusBar() { /* minimal: no-op */ },
    destroy() { process.stdout.write(PROMPT); },
  };
}

export async function runTUI(onMessage: (msg: string) => Promise<string>): Promise<void> {
  const rl = readline.createInterface({ input, output });
  console.clear();
  console.log("ฅ(^•ﻌ•^)ฅ MEOW - Turn-based CLI\n");

  for await (const line of rl) {
    const response = await onMessage(line);
    if (response) console.log(response);
    process.stdout.write(PROMPT);
  }
}
