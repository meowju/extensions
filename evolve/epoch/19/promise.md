=== EPOCH PROMISE ===

## Capability to Implement
Session Compaction via LLM Summarization

## What It Does
Automatically compact long conversation history into a concise summary when context window approaches limit, preserving key decisions and patterns while freeing token space for continued work.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: Summary detection** - System detects when history exceeds threshold (e.g., 60% of max tokens)
2. **Test: Summarization call** - LLM receives condensed prompt asking for conversation summary
3. **Test: History replacement** - Original messages replaced with summary + key decisions
4. **Test: Context preservation** - Important facts, patterns, decisions preserved after compaction
5. **Test: Incremental compaction** - Multiple compactions work (each removing ~50% of history)
6. **Must be reproducible** - Run test that simulates 200 messages, trigger compaction, verify summary contains key items

## From Research: Cursor + Claude Code

### Cursor Pattern (April 2026)
Cursor implemented session compaction when context exceeded:
```
Long conversation detected
        ↓
LLM generates summary: "User working on X, completed Y, current issue Z"
        ↓
Old messages replaced with summary
        ↓
Continued work in compact context
```

### Claude Code Pattern
Claude Code uses "session compaction" when approaching limits:
> "When context window fills, system automatically summarizes and continues"

### Why This Epoch (Priority Fix)
Epoch 11's promise is NOT IMPLEMENTED and is blocking EVOLVE from proceeding. This epoch implements the missing `compactSession()` function to unblock the system.

### Implementation Location
- `agent-harness/src/core/session-store.ts` - Add compactSession() method
- `agent-harness/src/core/chat-context.ts` - Add auto-compaction trigger
- `agent-kernel/src/sidecars/streaming.ts` - Integrate with token counting

### Implementation Plan

1. Add `compactSession()` to session-store.ts:
```typescript
async compactSession(sessionId: string): Promise<void> {
  const history = await this.getHistory(sessionId);
  
  if (history.length < COMPACT_THRESHOLD) return;
  
  // Generate summary via LLM
  const summary = await this.agent.prompt(
    `Summarize this conversation into a brief overview preserving:\n` +
    `- Current task and goal\n` +
    `- Key decisions made\n` +
    `- Important files and patterns\n\n${formatHistory(history)}`
  );
  
  // Replace history with summary
  await this.replaceHistory(sessionId, [
    { role: "system", content: `Session summary: ${summary}` },
    ...history.slice(-10) // Keep recent messages for context
  ]);
}
```

2. Add auto-trigger in chat-context.ts before buildContextPrompt()

3. Add COMPACT_THRESHOLD constant (default: 50 messages)

## From Research: {Source}
- Cursor changelog (Apr 2026) - Session compaction pattern
- Claude Code docs - Context window management
- Epoch 11 promise.md - Detailed implementation specification

## Status
🔄 EPOCH 19 IN PROGRESS - Fixing blocking Epoch 11

This epoch implements Epoch 11's promise that was not implemented, removing the blocking issue that prevents EVOLVE from proceeding to Epoch 20.