# Epoch 14 Architecture: Permission Learning with Auto-Approve Threshold

## GAP Analysis

**Gap ID:** GAP-PERM-001/003

**Issue:** permissions.ts has approvalCount Map and threshold check but lacks /permissions reset command for clearing learned patterns.

## Architecture

### Learning Layer Flow

```
checkPermissionWithLearning(tool, params)
    ↓
1. isDangerous(params)? → ALWAYS DENY
    ↓ no
2. Check learning layer: approvalCount.get(key) >= APPROVAL_THRESHOLD?
    ↓ yes (>= 3)
3. → ALLOW (learned pattern)
    ↓ no
4. Check default rules via checkPermission(tool, params)
```

### Key Components

1. **approvalCount Map** - Tracks tool:params → approval count
2. **APPROVAL_THRESHOLD = 3** - Promotions from "ask" to "allow"
3. **checkPermissionWithLearning()** - Integrates learning with permission check
4. **recordApproval()** - Increments count for a tool+params
5. **resetLearnedPatterns()** - Clears both memory and persistence

### Hash Function

```typescript
function hashParams(params: unknown): string {
  return JSON.stringify(params || {});
}
```

Key format: `tool:hashParams(params)`

### Dangerous Pattern Detection

```typescript
function isDangerous(params: unknown): boolean {
  if (!params) return false;
  const str = typeof params === "string" ? params : JSON.stringify(params);
  return /\brm\s+-rf\b/i.test(str) ||
         /\bdd\b/.test(str) ||
         /\bsudo\s+rm\b/i.test(str);
}
```

### Persistence

Learned patterns saved to `~/.meow/permissions.json`:

```json
{
  "learnedPatterns": {
    "shell:{\"cmd\":\"echo test\"}": 3,
    "shell:{\"cmd\":\"npm install\"}": 5
  }
}
```

## /permissions reset Command

The slash command infrastructure should invoke `resetLearnedPatterns()`:

```typescript
if (prompt.startsWith("/permissions")) {
  if (prompt.includes("reset")) {
    resetLearnedPatterns();
    return "Permission learning patterns cleared.";
  }
}
```

## Test Coverage

See `dogfood/epoch-14-permissions-reset.test.ts`

### T1: approvalCount Map Initialization
- T1.1: Map is exported
- T1.2: APPROVAL_THRESHOLD = 3
- T1.3: Map stores/retrieves counts

### T2: Threshold Check
- T2.1: First approval NOT promote
- T2.2: Second approval NOT promote
- T2.3: Third approval PROMOTES to allow
- T2.4: Beyond threshold remains allow

### T3: checkPermissionWithLearning Integration
- T3.1: Function exported
- T3.2: Learning checked BEFORE default rules
- T3.3: Returns correct PermissionResult

### T4: resetLearnedPatterns()
- T4.1: Clears in-memory Map
- T4.2: Cleared patterns no longer auto-approve
- T4.3: Function exported

### T5: Auto-Approve After Threshold
- T5.1: Repeated prompts reduced
- T5.2: Different commands don't share count
- T5.3: Different params don't share count

### T6: Dangerous Pattern Blocking
- T6.1: Destructive patterns always blocked

## Implementation Status

✅ IMPLEMENTED:
- `approvalCount` Map with APPROVAL_THRESHOLD = 3
- `checkPermissionWithLearning()` function
- `recordApproval()` function
- `resetLearnedPatterns()` function
- `isDangerous()` pattern detection
- Persistence to permissions.json

🔲 NOT IMPLEMENTED:
- `/permissions reset` slash command (needs slash-commands.ts integration)

## Files Modified

- `agent-kernel/src/sidecars/permissions.ts` - Learning layer