# epoch-14-fix: beforeEach Import Error

**Priority:** P0 - Internal Gap (Dogfood Validation Error)  
**Created:** 2026-04-26  
**Status:** ACTIVE

## Issue Summary

Epoch 14 tests have 1 error out of 8 tests:
- **ERROR**: `beforeEach is not defined` at line 34 in main describe block

Current state: `bun test dogfood/epoch-14-permissions-reset.test.ts` → 8 pass, 1 error

## Root Cause

The test file imports `describe, test, expect` from `bun:test` but is missing `beforeEach` and `afterEach`:

```typescript
// Current (broken):
import { describe, test, expect } from "bun:test";

// Should be:
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
```

## Fix

### Step 1: Update Import

In `dogfood/epoch-14-permissions-reset.test.ts`:

Change line 6 from:
```typescript
import { describe, test, expect } from "bun:test";
```

To:
```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
```

### Step 2: Verify

Run tests:
```bash
bun test dogfood/epoch-14-permissions-reset.test.ts --reporter verbose
```

Expected: 15 pass, 0 fail

## Validation Criteria

- [ ] All 15 tests pass
- [ ] No errors
- [ ] `approvalCount`, `APPROVAL_THRESHOLD`, `checkPermissionWithLearning`, `resetLearnedPatterns` all work

## Files Involved

- `dogfood/epoch-14-permissions-reset.test.ts` - Test file
- `agent-kernel/src/sidecars/permissions.ts` - Implementation (already correct)

## Notes

This is a simple import fix. The implementation in `permissions.ts` already correctly exports:
- `approvalCount: Map<string, number>`
- `APPROVAL_THRESHOLD = 3`
- `checkPermissionWithLearning()`
- `recordApproval()`
- `resetLearnedPatterns()`

The test file just needs the missing import.