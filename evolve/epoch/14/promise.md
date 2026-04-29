=== EPOCH PROMISE ===

## Capability to Implement
Auto-Approve Learning for Permission Patterns

## What It Does
Learns user permission preferences during sessions and auto-approves repeated safe operations without prompting, reducing friction while maintaining security boundaries.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: Pattern learning** - After 3+ identical safe shell commands (e.g., `git status`), system stops prompting and auto-approves
2. **Test: Permission persistence** - Approved patterns persist across sessions (via permissions.json)
3. **Test: Dangerous command blocking** - Dangerous commands (`rm -rf`, `dd`, `sudo`) NEVER auto-approve regardless of frequency
4. **Test: Auto-revoke** - User can revoke auto-approve with `/permissions reset` command
5. **Must be reproducible** - Run test sequence: prompt 3x → auto-approve on 4th → verify no prompt

## From Research: Claude Code + Cursor

### Claude Code Pattern
Claude Code tracks user approvals and learns to auto-approve:
> "When you've approved a tool call, subsequent similar calls are auto-approved for this session"

### Cursor Pattern (Apr 2026)
Cursor implemented learned approvals:
> "Fixed issue where permission prompts appeared too frequently for common operations"
> "Trusted commands no longer prompt within a session"

### Meow's Current State
From CAPABILITY_STATUS.md iteration 15 validation:
- Permission system properly configured with pattern-based rules
- `checkPermission()` correctly returns `allow`, `ask`, or `deny`
- User config file supports adding custom rules
- **Missing:** Learning layer that auto-promotes `ask` → `allow` for repeated safe operations

### Implementation Approach

Based on research findings:

1. **Track approval frequency** in session or memory:
```typescript
// Track command approvals
const approvalCount = new Map<string, number>();
const APPROVAL_THRESHOLD = 3;

function checkPermissionWithLearning(tool: string, params: ToolParams): PermissionResult {
  // First check: dangerous pattern?
  if (isDangerous(params)) return 'deny';
  
  // Second check: existing rule?
  const existing = checkPermission(tool, params);
  if (existing !== 'ask') return existing;
  
  // Third check: learned approval?
  const key = `${tool}:${hashParams(params)}`;
  const count = approvalCount.get(key) || 0;
  
  if (count >= APPROVAL_THRESHOLD) {
    return 'allow'; // Auto-approve learned pattern
  }
  
  // On user approval, increment count
  approvalCount.set(key, count + 1);
  return 'ask';
}
```

2. **Persist learned patterns** to permissions.json:
```typescript
async function persistLearnedPatterns(): Promise<void> {
  const learned = Array.from(approvalCount.entries())
    .filter(([_, count]) => count >= APPROVAL_THRESHOLD)
    .map(([key, _]) => parseKey(key));
  
  await updatePermissions({
    rules: [...userRules, ...learned.map(p => ({
      tool: p.tool,
      action: 'allow',
      learned: true,
      pattern: p.pattern
    }))]
  });
}
```

3. **Safety boundaries**:
```typescript
function isDangerous(params: ToolParams): boolean {
  const dangerousPatterns = [
    /rm\s+-rf\s+\//,           // Root deletion
    /dd\s+.*of=/,              // Disk wipe
    /sudo\s+rm/,               // Privilege escalation
    /curl.*\|.*sh/,            // Pipe to shell
  ];
  return dangerousPatterns.some(p => p.test(params.cmd || ''));
}
```

### Research Sources
- Iteration 4: Cursor "lazy updates" and auto-approval patterns
- Iteration 5: Permission system root cause analysis  
- Iteration 15: Permission system fix validation (all 459 tests passing)

## Implementation Location
- `agent-harness/src/sidecars/permissions.ts` - Add learning layer
- `agent-harness/src/core/session-store.ts` - Track approval counts per session
- `agent-harness/src/commands/permissions.ts` - Add `/permissions reset` command

## Status
⏳ WAITING FOR DOGFOOD VALIDATION

Epoch 15 validated the permission system fix. Epoch 14 adds the intelligence layer: learning from user approvals to reduce friction for safe operations.
