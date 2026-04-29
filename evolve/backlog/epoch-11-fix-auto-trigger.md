# epoch-11-fix: Session Compaction Auto-Trigger

**Priority:** P0 - Internal Gap (Dogfood Validation Failed)  
**Created:** 2026-04-26  
**Status:** ACTIVE

## Issue Summary

Epoch 11 tests have 2 failing tests out of 21:
1. **IV4 FAIL**: `MemoryStore.addMessageToThread` body doesn't show `compactThread` in regex match
2. **T2.2 FAIL**: Summarize receives only old messages test

Current state: `bun test dogfood/epoch-11-compact-session.test.ts` → 19 pass, 2 fail

## Root Cause Analysis

### IV4 Test Issue
The test uses regex to find the `addMessageToThread` method body:
```typescript
const methodMatch = content.match(/addMessageToThread\([^)]+\)[^{]*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
```

The regex is complex and may not correctly capture the method body. The actual method body is:
```typescript
addMessageToThread(channelId: string, userId: string, role: string, content: string): void {
  const thread = this.getOrCreateThread(channelId, userId, "Conversation");
  thread.messages.push({
    role,
    content,
    timestamp: Date.now()
  });
  // ...more code
}
```

The compactThread call may be present but the regex doesn't capture it.

### T2.2 Test Issue
The test checks that `mockSummarize` receives only old messages (not recent ones). This requires:
1. Old messages to be identified correctly
2. Recent messages to be preserved
3. Summarization to only receive the old portion

## Fix Options

### Option A: Fix the Test (Recommended)
Update the IV4 test to not rely on fragile regex matching:

```typescript
// Instead of regex, check that:
1. addMessageToThread exists
2. needsCompaction exists
3. compactThread exists
4. The methods interact correctly (integration test)
```

### Option B: Fix the Implementation
Ensure `addMessageToThread` calls `compactThread` when threshold is reached:

```typescript
addMessageToThread(channelId: string, userId: string, role: string, content: string): void {
  const thread = this.getOrCreateThread(channelId, userId, "Conversation");
  thread.messages.push({
    role,
    content,
    timestamp: Date.now()
  });
  
  // Auto-trigger compaction check
  if (this.needsCompaction(channelId)) {
    this.compactThread(channelId);
  }
}
```

## Proposed Fix: Option A + B Combined

1. Update test IV4 to use integration test pattern
2. Ensure implementation calls compactThread after threshold

## Implementation

### Step 1: Verify Implementation

From `src/core/memory.ts`, check that:
- `needsCompaction(channelId)` is called somewhere
- `compactThread(channelId)` is called after threshold

### Step 2: Update Test

```typescript
test("IV4: MemoryStore auto-triggers compaction via addMessageToThread", async () => {
  const { MemoryStore } = await import("../src/core/memory.ts");
  const store = new MemoryStore(testDir);
  
  const channelId = "test-auto-trigger";
  
  // Add messages up to threshold
  for (let i = 0; i < 15; i++) {
    store.addMessageToThread(channelId, "user1", "user", `Message ${i}`);
    store.addMessageToThread(channelId, "user1", "meow", `Response ${i}`);
  }
  
  // Should not have compacted yet
  const thread1 = (store as any).contextThreads.get(channelId);
  expect(thread1.messages.length).toBe(30);
  
  // Add one more pair to trigger compaction
  store.addMessageToThread(channelId, "user1", "user", "Trigger message");
  store.addMessageToThread(channelId, "user1", "meow", "Trigger response");
  
  // Now should have compacted (messages < 32)
  const thread2 = (store as any).contextThreads.get(channelId);
  expect(thread2.messages.length).toBeLessThan(32);
  expect(thread2.compressedSummaries.length).toBeGreaterThan(0);
});
```

### Step 3: Run Tests

```bash
bun test dogfood/epoch-11-compact-session.test.ts --reporter verbose
```

Expected: 21 pass, 0 fail

## Validation Criteria

- [ ] All 21 tests pass
- [ ] IV4 test uses integration pattern (not fragile regex)
- [ ] T2.2 test correctly validates summarization separation
- [ ] Auto-compaction triggers at threshold

## Files Involved

- `src/core/memory.ts` - MemoryStore implementation
- `dogfood/epoch-11-compact-session.test.ts` - Test file
- `src/core/session-store.ts` - compactSession function

## Notes

The test failure is likely a test issue, not an implementation issue. The MemoryStore already has `needsCompaction` and `compactThread` methods, and they should be called in `addMessageToThread`. The IV4 regex test is too fragile.

**Action**: Fix the test to use integration testing instead of regex parsing.