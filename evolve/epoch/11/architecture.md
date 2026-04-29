# Epoch 11 Architecture: Session Compaction with Auto-Trigger

## GAP Analysis

**Gap ID:** GAP-SESS-002 (already marked IMPLEMENTED)

**Issue:** compactSession() function exists in session-store.ts but lacks auto-trigger integration in chat-context.ts (which doesn't exist).

## Architecture Decision

### Primary: MemoryStore.compactThread()

After analyzing the codebase, the decision was to use `MemoryStore.compactThread()` as the primary compaction mechanism rather than creating a separate chat-context.ts:

1. **MemoryStore already handles hierarchical memory:**
   - `addMessageToThread()` auto-triggers compaction via `COMPACT_THRESHOLD`
   - `compactThread()` compresses older messages into summaries
   - `getThreadContext()` returns compressed context + recent messages

2. **session-store.ts provides fallback:**
   - `compactSession()` is available for direct session compaction
   - Useful for external callers or CLI tools

### Key Constants

```typescript
const WORKING_MEMORY_SIZE = 10;    // Keep last N messages as-is
const COMPACT_THRESHOLD = 20;     // When to trigger compaction
const COMPRESS_CHUNK_SIZE = 10;  // Compress N messages at a time
```

### Flow

```
addMessageToThread(channelId, userId, role, content)
    ↓
messages.length >= COMPACT_THRESHOLD?
    ↓ yes
compactThread(channelId, userId)
    ↓
1. Extract messagesToCompact = messages.slice(0, -WORKING_MEMORY_SIZE)
2. Generate summary via generateSimpleSummary()
3. Extract facts via extractFactsFromMessages()
4. Push to compressedSummaries[]
5. Keep only working memory
```

### Context Output Format

```
## Past Conversation Summary
- Summarized topic: User discussed project planning
- Summarized topic: User worked on implementation

## Recent Conversation
TestUser: What progress on the bot?
Meow: Got the relay working! Now adding state indicators...
```

## Test Coverage

See `dogfood/epoch-11-compact-session.test.ts`

### T1: Summary Detection
- T1.1: compactSession returns early when under threshold
- T1.2: Auto-trigger fires when messages exceed threshold

### T2: Summarization Call
- T2.1: LLM summarizeFn is called when over threshold
- T2.2: Summarize receives only old messages (not recent)

### T3: History Replacement
- T3.1: Session file overwritten with compacted version
- T3.2: Recent messages preserved after compaction

### T4: Context Preservation
- T4.1: Key decisions preserved in summary
- T4.2: User profile facts extracted during compaction

### T5: Incremental Compaction
- T5.1: Multiple compaction cycles reduce progressively
- T5.2: Compressed summaries accumulated correctly

### T6: Reproducible - High Volume
- T6.1: Handles 200 messages with proper compaction
- T6.2: Works with custom maxTokens setting

## Implementation Status

✅ IMPLEMENTED:
- `session-store.ts`: compactSession() function
- `memory.ts`: compactThread(), needsCompaction(), auto-trigger
- `memory.ts`: compressedSummaries hierarchical structure
- `memory.ts`: generateSimpleSummary() extractive summarization

## Files Modified

- `src/core/memory.ts` - MemoryStore with compaction
- `agent-kernel/src/core/session-store.ts` - compactSession() function