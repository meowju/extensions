# TUI Sidecar

**Priority:** P2 (Medium)  
**Status:** Proposed  
**Created:** 2026-04-24

---

## Problem Statement

Current Meow output is plain `console.log` - no:
- Message history scrollback
- Progress indicators
- Status bar
- Streaming animation
- Interactive prompts

**Reference:** Hermes Agent has "A real terminal interface" with multiline editing, slash-command autocomplete, conversation history, interrupt-and-redirect, and streaming tool output.

---

## Target State

```
┌─ Meow ─────────────────────────────────────────────────────────┐
│ ● Thinking...                                                 │
│ ○ Session: 4 messages │ Tokens: 2.1k │ Model: MiniMax-M2.7    │
├──────────────────────────────────────────────────────────────┤
│ [Claude] Hi! How can I help?                                  │
│ [Meow]  I'm analyzing the project structure...               │
│                                                             │
│ > ls -la                                                     │
│Executing... ✓                                                │
│                                                             │
│ total 64                                                     │
│ drwxr-xr-x  3 root root  4096 Apr 24 17:23 .                 │
│ drwxr-xr-x  4 root root  4096 Apr 24 15:25 docs              │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Ideas

### 1. Library Choice

Option A: **Ink** (React for CLIs) - TypeScript friendly  
Option B: **blessed** - Pure JS, more control  
Option C: **custom VT100** - Minimal, full control

**Recommendation:** Ink for fast development, blessed for low-level control.

### 2. Core Components

```typescript
interface TUIComponents {
  // Layout
  screen: Screen;
  statusBar: StatusBar;
  outputArea: ScrollbackArea;
  inputLine: InputLine;
  
  // State
  messages: Message[];
  state: AgentState;
  stats: { tokens: number; model: string };
}
```

### 3. Features

| Feature | Description |
|---------|-------------|
| Scrollback | Scroll through message history |
| Progress | Animated indicators during tool execution |
| Status | Model, token count, session info |
| Streaming | Real-time token display |
| History | Up/down arrows for command history |
| Autocomplete | Tab for file paths, slash commands |

---

## Files to Create

1. `agent-kernel/src/sidecars/tui.ts` (new)
2. `agent-kernel/src/sidecars/tui/components.ts` (new)
3. `agent-kernel/src/sidecars/tui/layout.ts` (new)
4. `agent-kernel/cli/index.ts` (integrate TUI mode)

---

## Acceptance Criteria

- [ ] Message history scrollback (up/down)
- [ ] Animated progress during tool execution
- [ ] Status bar with model/token info
- [ ] Real-time streaming display
- [ ] Slash command autocomplete
- [ ] `meow --tui` flag to enable

---

## Competition Analysis

| Feature | Hermes | Meow |
|---------|--------|------|
| Full TUI | ✅ | ❌ |
| Multiline editing | ✅ | ❌ |
| Slash autocomplete | ✅ | ❌ |
| History scrollback | ✅ | ❌ |
| Streaming tool output | ✅ | ❌ |

---

## Related Proposals

- `streaming-ux.md` - TUI requires proper streaming
- `repl.md` - REPL is prerequisite for TUI interactivity