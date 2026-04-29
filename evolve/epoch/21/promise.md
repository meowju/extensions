=== EPOCH PROMISE ===

## Capability to Implement
Permission Learning Integration into Main Flow

## What It Does
Wires `checkPermissionWithLearning()` into the actual permission check flow so the auto-approve learning layer is actually used during command execution, not just available for testing.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: Learning used in main flow** - When permission is checked for shell commands, `checkPermissionWithLearning` is called (not just `checkPermission`)
2. **Test: Permissions skill updated** - `/permissions check` command shows "learned pattern" reason after 3+ approvals
3. **Test: Integration documented** - Comments show where the integration point is in the codebase
4. **Must be reproducible** - Run a command 3 times via the actual shell tool, 4th should auto-approve

## From Research: {Source}
**Problem Found:** Epoch 20's `checkPermissionWithLearning()` was implemented but never wired into the main permission check flow. The function exists and passes tests, but no code actually calls it.

**Patterns from Research:**
1. **Self-healing pattern**: When a capability is validated but not integrated, it needs to be wired in
2. **Claude Code**: Permission learning is automatic and transparent to the user
3. **Cursor**: Learning happens silently in the background

**Integration Point:**
The permission check flow needs to call `checkPermissionWithLearning()` instead of `checkPermission()`. This likely happens in:
- `/app/agent-kernel/src/sidecars/permissions.ts` - where prompts are shown
- OR in the tool execution layer where permissions are checked

**Implementation Location**
- `/app/agent-kernel/src/sidecars/permissions.ts` - Wire learning into `promptPermission()` and export a unified check function
- `/app/agent-kernel/src/skills/permissions.ts` - Update check command to show learned patterns

## Status
🔄 EPOCH 21 IN PROGRESS - Integration research

**This epoch addresses the "last mile" problem: capabilities that exist but aren't integrated.**