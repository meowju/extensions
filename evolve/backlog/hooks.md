# Hooks Sidecar

**Priority:** P2 (Medium)  
**Status:** Proposed  
**Created:** 2026-04-24

---

## Problem Statement

No way to intercept/transform tool calls or agent actions. Users cannot:
- Auto-git-add after write operations
- Log all shell commands for audit
- Transform file paths before read
- Trigger notifications on completion

**Reference:** TODO.md Phase 5.1 describes hooks for pre/post tool execution with simple transformations.

---

## Target State

```json
// .agent-kernel/hooks.json
{
  "pre_tool": [
    { "tool": "shell", "action": "log" },
    { "tool": "write", "action": "git-add" }
  ],
  "post_tool": [
    { "tool": "shell", "action": "notify" },
    { "tool": "execute", "action": "persist-context" }
  ],
  "on_complete": [
    { "action": "summarize-session" }
  ]
}
```

---

## Implementation Ideas

### 1. Hook Types

```typescript
type HookAction = 
  | "log"           // Log to console/file
  | "git-add"       // Auto git add written files
  | "notify"        // Send notification
  | "transform"     // Transform args/result
  | "persist"       // Save to memory
  | "custom";       // Run custom script

interface Hook {
  tool?: string;     // Tool name to match, or undefined for all
  action: HookAction;
  config?: Record<string, unknown>;
  script?: string;  // For "custom" action
}
```

### 2. Hook Execution Order

```
Tool Called → pre_tool hooks → execute tool → post_tool hooks → return result
                                                   ↓
                                          on_complete hooks (after agent done)
```

### 3. Built-in Hooks

| Action | Description |
|--------|-------------|
| `log` | Log tool call to `.agent-kernel/hooks.log` |
| `git-add` | Run `git add` on files modified by write/edit tools |
| `notify` | Send system notification on completion |
| `transform` | Apply string transforms to args (e.g., expand paths) |

---

## Files to Create

1. `agent-kernel/src/sidecars/hooks.ts` (new)
2. `agent-kernel/src/core/hook-registry.ts` (new)
3. `agent-kernel/src/core/hook-executor.ts` (new)
4. `agent-kernel/src/core/lean-agent.ts` (integrate hooks)

---

## Acceptance Criteria

- [ ] Hook config file (`.agent-kernel/hooks.json`)
- [ ] Pre/post tool execution hooks
- [ ] Built-in actions: log, git-add, notify
- [ ] Custom script execution
- [ ] Hook failure doesn't block tool execution (configurable)
- [ ] `MEOW_HOOKS=false` to disable

---

## Related Proposals

- `memory.md` - Hooks can persist context to memory
- `analytics.md` - Hooks can track usage for analytics