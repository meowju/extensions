# Epoch 21 Architecture: Permission Learning Integration

## Context
Epoch 20 implemented `checkPermissionWithLearning()` but it was never wired into the actual permission check flow. This epoch completes the "last mile" of integration—connecting the learning layer to where tools are actually executed.

## Problem Statement
- `checkPermissionWithLearning()` exists and passes unit tests
- No code path actually calls it during tool execution
- The auto-approve learning never triggers because it's not in the hot path

## Solution: Wire Learning Into Main Flow

### Integration Point
The integration happens in `agent-kernel/src/sidecars/tool-registry.ts` within `executeTool()`.

**Before (existing code):**
```typescript
const permission = checkPermission(toolName, args);
```

**After (Epoch 21):**
```typescript
const { checkPermissionWithLearning, recordApproval } = await import("./permissions.ts");
const permission = checkPermissionWithLearning(toolName, args);
```

### Data Flow

```
executeTool(toolName, args, context)
    │
    ├── checkPermissionWithLearning(toolName, args)
    │       │
    │       ├── isDangerous(params)? ──deny──► BLOCK
    │       │
    │       ├── approvalCount.get(key) >= 3? ──allow──► AUTO-APPROVE
    │       │
    │       └── checkPermission(toolName, args) ──ask/allow/deny──► RETURN
    │
    ├── action === "deny"? ──return error
    │
    ├── action === "ask"?
    │       ├── context.dangerous? ──recordApproval()──► continue
    │       └── else: promptPermission()
    │               ├── denied? ──return error
    │               └── granted? ──recordApproval()──► continue
    │
    └── action === "allow"? ──continue to tool.execute()
```

### Key Changes

1. **Replace checkPermission with checkPermissionWithLearning**
   - Location: `tool-registry.ts:480-510`
   - Import both functions from `./permissions.ts`

2. **Record approvals in dangerous mode**
   - When user runs with `--dangerous`, record approval so learning still works

3. **Record approvals after user grants permission**
   - After promptPermission() returns true, call recordApproval()

4. **Update /permissions skill to show learning status**
   - `skills/permissions.ts` handleCheck() now uses checkPermissionWithLearning
   - Displays "Learning: 🔄 X/3 approvals" or "Learning: ✅ AUTO-APPROVED"

### Files Modified

| File | Change |
|------|--------|
| `sidecars/tool-registry.ts` | Replace `checkPermission` → `checkPermissionWithLearning`, add `recordApproval()` calls |
| `skills/permissions.ts` | Use `checkPermissionWithLearning` in handleCheck, display learning status |

### Learning Layer Logic

```typescript
export function checkPermissionWithLearning(tool, params):
  1. isDangerous(params)? → deny
  2. approvalCount.get(key) >= 3? → allow (learned pattern)
  3. checkPermission(tool, params) → return result
```

The learning layer is checked BEFORE the default rules, so learned patterns can override default allow rules (e.g., a user can approve a dangerous-but-intentional command 3 times and it will auto-approve).

### Reproducible Auto-Approve

After integration:
1. Run command → `ask` (not in dangerous mode)
2. User approves → `recordApproval()` called, count = 1
3. Run command → `ask`, approve → count = 2
4. Run command → `ask`, approve → count = 3
5. **Run command 4th time → `allow` (learned pattern)**

## Validation Criteria

1. **Learning used in main flow**: `executeTool()` calls `checkPermissionWithLearning`, not `checkPermission`
2. **Permissions skill shows learned pattern**: `/permissions check` shows "AUTO-APPROVED" after 3+ approvals
3. **Integration documented**: Code comments reference Epoch 21
4. **Reproducible 4th auto-approve**: Run same command 4 times, 4th auto-approves without prompt

## Testing Strategy

See `validation.test.ts` for executable tests covering:
- Learning layer called (not raw checkPermission)
- Approval count increments
- Auto-approve at threshold (3)
- Reproducible 4th run
- Permissions skill shows learning status

## Comparison: Before vs After

| Behavior | Before (Epoch 20) | After (Epoch 21) |
|----------|-------------------|------------------|
| 1st run of new command | ask | ask |
| 2nd run | ask | ask |
| 3rd run | ask | ask |
| 4th run | ask | **allow** (learned) |
| `/permissions check` output | Shows rule match | Shows learning status |

## References

- Promise: `evolve/epoch/21/promise.md`
- Sidecar: `agent-kernel/src/sidecars/permissions.ts`
- Registry: `agent-kernel/src/sidecars/tool-registry.ts`
- Skill: `agent-kernel/src/skills/permissions.ts`