# REPL Sidecar

**Priority:** P2 (Medium)  
**Status:** Proposed  
**Created:** 2026-04-24

---

## Problem Statement

CLI is single-shot: pass prompt, get response, exit. No interactive mode:
- Can't chain multiple operations
- No command history
- No multi-line input

**Reference:** TODO.md Phase 3.3 describes REPL sidecar with readline input loop, command history, multi-line input.

---

## Target State

```
$ meow
🐱 Meow v0.1.0 - Type 'exit' to quit, 'help' for commands

> analyze this project
[Agent thinking...]
Done. Found 12 TypeScript files, 3 test files.

> create a test for auth module
[Agent executing...]
Writing src/tests/auth.test.ts... ✓

> exit
Session saved. Goodbye!
```

---

## Implementation Ideas

### 1. Readline Loop

```typescript
import * as readline from "node:readline";

async function runREPL() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  for await (const line of rl) {
    if (line === "exit") break;
    if (line === "help") { showHelp(); continue; }
    
    const result = await runLeanAgent(line);
    console.log(result.content);
    rl.prompt();
  }
}
```

### 2. Command History

```typescript
const historyPath = ".agent-kernel/.history";

rl.on("line", (line) => {
  // Save to history file
  appendFileSync(historyPath, line + "\n");
});

// Load history on start
const history = readFileSync(historyPath, "utf-8").split("\n");
history.forEach(cmd => rl.history.push(cmd));
```

### 3. Multi-line Input

```typescript
function isMultiLine(input: string): boolean {
  // Detect trailing indentation or unclosed brackets
  return /\n\s{2,}/.test(input) || 
         /[\[({]$/.test(input.trim());
}

async function getMultiLineInput(rl): Promise<string> {
  let lines = [rl.questionSync("")];
  while (isMultiLine(lines[lines.length - 1])) {
    lines.push(rl.questionSync(". "));
  }
  return lines.join("\n");
}
```

### 4. State Persistence

```
REPL mode loads last session automatically (via session-store)
Commands:
  - /new - Start fresh session
  - /resume - Resume specific session
  - /sessions - List saved sessions
```

---

## Files to Create/Modify

1. `agent-kernel/src/sidecars/repl.ts` (new)
2. `agent-kernel/src/sidecars/repl/history.ts` (new)
3. `agent-kernel/src/sidecars/repl/multiline.ts` (new)
4. `agent-kernel/cli/index.ts` (integrate REPL mode)

---

## Acceptance Criteria

- [ ] Interactive readline loop
- [ ] Command history (up/down arrows)
- [ ] Multi-line input (detect indentation)
- [ ] Built-in commands: exit, help, new, resume
- [ ] Session persistence between REPL invocations
- [ ] `meow --repl` flag to enable

---

## Related Proposals

- `tui.md` - REPL is prerequisite for TUI
- `streaming-ux.md` - REPL benefits from streaming display