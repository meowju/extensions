=== EPOCH PROMISE ===

## Capability to Implement
Auto-Approve Learning Layer for Permission Patterns

## What It Does
Automatically promotes permission requests from "ask" to "allow" after repeated user approvals (threshold: 3), learning user's patterns while still blocking dangerous commands like `rm -rf /`, `dd`, and `sudo rm`.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: Learning layer** - System tracks approval count per tool+params combination
2. **Test: Threshold auto-approve** - After 3+ approvals, subsequent requests auto-approved
3. **Test: Dangerous pattern blocking** - `rm -rf`, `dd`, `sudo rm` always denied regardless of approval count
4. **Test: Persistence** - Learned approvals persist across sessions via permissions.json
5. **Test: /permissions reset command** - Users can clear learned patterns
6. **Must be reproducible** - Approve same command 3 times, 4th should auto-approve

## From Research: Claude Code + Cursor

### Claude Code Pattern (Permission Learning)
Claude Code uses "permission learning" where:
```
First use: Ask user → User approves
        ↓
Second use: Ask user → User approves  
        ↓
Third use: Ask user → User approves
        ↓
Fourth use: Auto-approve (pattern learned)
```

### Cursor Pattern
Cursor tracks tool usage patterns and auto-approves safe patterns after initial approval.

### Why This Epoch (Priority Fix)
Epoch 14's promise is NOT IMPLEMENTED and is blocking EVOLVE from proceeding. This epoch implements the missing learning layer to unblock the system.

### Implementation Location
- `/app/agent-kernel/src/sidecars/permissions.ts` - Add approvalCount map and learning logic
- `/app/agent-kernel/src/skills/permissions.ts` - Add /permissions reset command handler

### Implementation Plan

1. Add learning layer to permissions.ts:
```typescript
// Approval tracking for learning layer
const approvalCount = new Map<string, number>();
const APPROVAL_THRESHOLD = 3;

function hashParams(params: unknown): string {
  return JSON.stringify(params || {});
}

// Check permission with learning
export function checkPermissionWithLearning(
  tool: string, 
  params?: unknown
): PermissionResult {
  // Always deny dangerous patterns
  if (isDangerous(params)) return { action: 'deny', reason: 'dangerous pattern' };
  
  // Check existing rules first
  const existing = checkPermission(tool, params);
  if (existing.action !== 'ask') return existing;
  
  // Learning layer: promote to allow after threshold
  const key = `${tool}:${hashParams(params)}`;
  const count = approvalCount.get(key) || 0;
  
  if (count >= APPROVAL_THRESHOLD) {
    return { action: 'allow', reason: `learned pattern (${count} approvals)` };
  }
  
  return existing;
}

// Record user approval
export function recordApproval(tool: string, params?: unknown): void {
  const key = `${tool}:${hashParams(params)}`;
  approvalCount.set(key, (approvalCount.get(key) || 0) + 1);
}

// Reset learned patterns
export function resetLearnedPatterns(): void {
  approvalCount.clear();
}
```

2. Add /permissions reset command handler to skills/permissions.ts

3. Integrate: In the permission prompt handler, call `recordApproval()` when user approves

## From Research: {Source}
- Claude Code docs - Permission learning patterns
- Cursor settings - Permission management UI
- Epoch 14 promise.md - Detailed implementation specification

## Status
🔄 EPOCH 20 IN PROGRESS - Implementing blocking Epoch 14

This epoch implements Epoch 14's promise that was not implemented, removing another blocking issue that prevents EVOLVE from proceeding.