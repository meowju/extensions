# Epoch 23 Architecture: chat-context.ts Auto-Trigger Integration

## Gap Identified

**GAP-1 (DOGFOOD: epoch-11-session-compaction)**: 
- `session-store.ts` already contains `compactSession()` function
- `chat-context.ts` does NOT exist - needs to be created
- Auto-trigger integration is MISSING

## Current State

### session-store.ts (EXISTING - Working)
```
src/core/session-store.ts:
├── compactSession(sessionId, options) → CompactedSession
├── autoCompactSession(sessionId, options) → CompactedSession | null
├── sessionNeedsCompaction(sessionId) → boolean
├── COMPACT_THRESHOLD = 20 (exported)
├── estimateTokens(text) → number
├── appendToSession(sessionId, messages)
├── loadSession(sessionId) → SessionMessage[]
└── saveSession(sessionId, messages)
```

### chat-context.ts (MISSING - Needs Creation)
Required to wire up auto-trigger between session-store.ts and callers.

## Architecture Decision

### Option A: Create chat-context.ts as wrapper
- New file: `src/core/chat-context.ts`
- Wraps session-store.ts with auto-trigger logic
- Called by CLI/relay after each user message
- **RECOMMENDED**: Clean separation of concerns

### Option B: Enhance session-store.ts
- Add auto-trigger directly to session-store.ts
- SessionStore becomes responsible for its own lifecycle
- **REJECTED**: Violates single responsibility

### Option C: Use MemoryStore as primary
- Already exists with auto-trigger via `addMessageToThread()`
- session-store.ts is fallback for file-based sessions
- **REJECTED**: Doesn't address gap-1 requirement for chat-context.ts

## Recommended Architecture: chat-context.ts

```
src/core/
├── chat-context.ts     ← NEW (auto-trigger orchestration)
├── session-store.ts    ← EXISTS (compactSession provided)
└── memory.ts           ← EXISTS (alternative context store)

callers/ (CLI, relay)
├── CLI → chat-context.appendMessage() → auto-triggers compactSession()
└── relay → chat-context.appendMessage() → auto-triggers compactSession()
```

## Function Interface

### chat-context.ts

```typescript
import { compactSession, sessionNeedsCompaction, COMPACT_THRESHOLD } from './session-store';

interface ChatContextOptions {
  sessionId: string;
  maxTokens?: number;
  summarizeFn: (messages: SessionMessage[]) => Promise<string>;
}

/**
 * Add a message to chat context and auto-compact if needed.
 * Returns compacted result if auto-compaction triggered.
 */
export async function appendWithAutoCompact(
  sessionId: string,
  messages: SessionMessage[],
  options: ChatContextOptions
): Promise<{ appended: boolean; compactionResult?: CompactedSession }>

/**
 * Check if session needs compaction (calls sessionNeedsCompaction)
 */
export function needsCompaction(sessionId: string): boolean

/**
 * Manually trigger compaction (for explicit /compact command)
 */
export async function triggerCompaction(
  sessionId: string,
  options: ChatContextOptions
): Promise<CompactedSession>

/**
 * Get current context for LLM (compacted + recent messages)
 */
export function getContext(sessionId: string, maxRecent?: number): string
```

## Auto-Trigger Logic

```
User message arrives
       ↓
appendWithAutoCompact(sessionId, [message], options)
       ↓
appendToSession(sessionId, [message])
       ↓
if (sessionNeedsCompaction(sessionId)) {
  return await compactSession(sessionId, options)
}
       ↓
return { appended: true }
```

## TDD Requirements

### Validation Tests (validation.test.ts)

1. **T1: chat-context.ts integration**
   - T1.1: chat-context.ts imports from session-store.ts
   - T1.2: appendWithAutoCompact calls appendToSession
   - T1.3: appendWithAutoCompact calls compactSession when threshold reached

2. **T2: Auto-trigger fires correctly**
   - T2.1: Threshold check (COMPACT_THRESHOLD) triggers at correct count
   - T2.2: Returns compaction result when triggered
   - T2.3: Returns appended:true when not triggered

3. **T3: Context retrieval**
   - T3.1: getContext returns formatted recent messages
   - T3.2: getContext includes summary when compacted

4. **T4: Error handling**
   - T4.1: Gracefully handles missing session
   - T4.2: Gracefully handles summarizeFn errors

5. **T5: Boundary cases**
   - T5.1: Empty session
   - T5.2: Session with only system messages
   - T5.3: Rapid consecutive appends

## Meow Ecosystem Integration

### Sidecars
- None directly - chat-context.ts is core infrastructure

### MCP Integration
- chat-context.ts could integrate with MCP servers for context retrieval
- Future: Add MCP resource for session context

### Registry
- No registry integration needed

## File Locations

| File | Status | Location |
|------|--------|----------|
| session-store.ts | EXISTS | src/core/session-store.ts |
| chat-context.ts | NEW | src/core/chat-context.ts |
| memory.ts | EXISTS | src/core/memory.ts |

## Success Criteria

1. ✅ chat-context.ts imports and uses session-store.ts::compactSession
2. ✅ Auto-trigger fires at COMPACT_THRESHOLD (20 messages)
3. ✅ appendWithAutoCompact returns compaction result when triggered
4. ✅ getContext returns formatted context string
5. ✅ All validation tests pass

## Test Execution

```bash
bun test evolve/epoch/23/validation.test.ts
```

## Notes

- This architecture follows the established pattern from MemoryStore
- chat-context.ts is a thin wrapper that orchestrates auto-trigger
- SessionStore remains the source of truth for file-based sessions
- CLI/relay should be updated to use chat-context.ts appendWithAutoCompact()