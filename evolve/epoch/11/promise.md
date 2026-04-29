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

### Implementation Approach

Based on iteration 5 learnings, we know:
- `sessionStore.getHistory()` provides conversation messages
- `agent.prompt()` can trigger LLM summarization
- Need to preserve file paths, decisions, patterns

### Proposed Implementation

```typescript
async function compactSession(sessionId: string): Promise<void> {
  const history = await sessionStore.getHistory(sessionId);
  
  if (history.length < COMPACT_THRESHOLD) return;
  
  // Generate summary via LLM
  const summary = await llm.summarize(
    `Summarize this conversation into a brief overview preserving:\n` +
    `- Current task and goal\n` +
    `- Key decisions made\n` +
    `- Important files and patterns\n\n${formatHistory(history)}`
  );
  
  // Replace history with summary
  await sessionStore.replaceHistory(sessionId, [
    { role: "system", content: `Session summary: ${summary}` },
    ...history.slice(-10) // Keep recent messages for context
  ]);
}
```

### Token Budget Strategy
- 128K max context → compact at 80K (62.5%)
- Summary target: ~2K tokens
- Keep recent: ~5K tokens
- Net savings: ~73K tokens

## Implementation Location
- `agent-harness/src/core/session-store.ts` - Add compactSession() method
- `agent-harness/src/core/chat-context.ts` - Add auto-compaction trigger
- `agent-kernel/src/sidecars/streaming.ts` - Integrate with token counting

## Status
⏳ WAITING FOR DOGFOOD VALIDATION

Previous epochs established streaming and token buffering. This epoch implements the final piece: automatic session compaction to enable indefinite conversations.