# EPOCH 23 BUILD Fix Briefing

## Status
27 tests PASS, 3 tests FAIL - need targeted fixes before DOGFOOD validation can unblock EVOLVE.

## Required Fixes

### Fix 1: Export needsCompaction function (T1.3)
**Problem**: chat-context.ts doesn't export `needsCompaction` function.
**Solution**: Add `needsCompaction` export to chat-context.ts:
```typescript
export function needsCompaction(sessionId: string): boolean {
  return sessionNeedsCompaction(sessionId);
}
```

### Fix 2: triggerCompaction returns null for non-existent sessions (T4.4)
**Problem**: Returns `{ messages: [], summary: "", originalCount: 0, compactedCount: 0 }` instead of `null`.
**Solution**: Modify `triggerCompaction` in chat-context.ts to check if session file exists first:
```typescript
export async function triggerCompaction(
  sessionId: string,
  options: ChatContextOptions
): Promise<any> {
  const dir = getSessionDir();
  const file = join(dir, `${sessionId}.jsonl`);
  
  // Return null for non-existent session
  if (!existsSync(file)) return null;
  
  // ... rest of implementation
}
```

### Fix 3: Manual compaction threshold logic (T6.1)
**Problem**: Test expects compaction with 14 messages, but `compactSession` requires 20+ messages unless `force=true`.
**Solution**: The `compactSession` already has `force` parameter. When `force=true`, it should compact with fewer messages. Check the logic - for 14 messages with force=true:
- keepRecent=6 (for force=true)
- oldMessages = 14 - 6 = 8
- This SHOULD trigger compaction

Debug: The issue may be that compactSession returns unchanged when oldMessages.length === 0. With 14 messages:
- systemMessages filtered out
- conversationMessages = 14
- keepRecent = 6
- oldMessages = 14 - 6 = 8 ✓

Should work. Check the actual implementation path for force=true with 14 messages.

## Commands to Run After Fixes
```bash
cd /app && bun test evolve/epoch/23/validation.test.ts
```

## Success Criteria
All 30 tests must PASS before DOGFOOD can validate.
