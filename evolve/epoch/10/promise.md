=== EPOCH PROMISE ===

## Capability to Implement
Streaming Message Update Integration

## What It Does
Integrate the existing streaming infrastructure (`sendStreamingMessage()`, `promptStreaming()`, `TokenBuffer`) into Meow's main relay flow so users see real-time token updates instead of waiting for complete responses.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: Thinking indicator appears first** - When user sends a message, they should see "🐱 thinking..." within 1-2 seconds BEFORE any full response
2. **Test: Tokens arrive progressively** - With a code-heavy response, tokens should update Discord message incrementally (not all at once at the end)
3. **Test: Code fences stay intact** - Streaming updates should NOT produce partial code fences like "```co" (verify via Discord message content)
4. **Test: Graceful fallback** - If streaming path fails, fall back to chunked send without crashing

## From Research: Claude Code + Cursor

### Claude Code Pattern (SSE Streaming)
```
LLM Stream → Terminal via SSE
        ↓
Real-time token display
        ↓
Graceful abort on limit
        ↓
Session compaction when context exceeded
```

### Cursor Pattern (Apr 15, 2026)
> "Fixed a bug where an agent conversation full of diffs or code blocks would flash and freeze"
> "Large edits stream more smoothly after cutting dropped frames by ~87%"

**Specific fixes:**
1. Lazy updates (not on every token)
2. Code block aware flushing at ``` boundaries
3. Frame drop monitoring → dynamic buffer adjustment

### Meow's Current Gap

| Component | Status | Location |
|-----------|--------|----------|
| `chunkMessageCodeFenceAware()` | ✅ IN USE | relay.ts |
| `sendChunksWithRateLimit()` | ✅ IN USE | relay.ts |
| `TokenBuffer` | ✅ EXISTS | agent-kernel/src/sidecars/streaming.ts |
| `promptStreaming()` | ✅ EXISTS | meow-agent.ts |
| `sendStreamingMessage()` | ⚠️ EXISTS | relay.ts (NOT USED IN MAIN FLOW) |
| **Main relay flow** | ❌ NON-STREAMING | Uses `meow.prompt()`, not streaming |

### Root Cause (Iteration 9 Finding)

Current main flow in relay.ts lines ~750+:
```typescript
// This is NON-STREAMING - user waits for complete response
reply = await meow.prompt(fullPrompt);
// ... then chunk and send
const chunks = chunkMessage(reply);
await sendChunksWithRateLimit(message, chunks);
```

The `sendStreamingMessage()` function exists (~line 280 in relay.ts) but is NOT wired into the main flow:
```typescript
async function sendStreamingMessage(
  meow: MeowAgentClient,
  message: Message,
  prompt: string,
  onToken: (token: string) => void
): Promise<string> {
  // Uses TokenBuffer with code fence awareness
  // Updates Discord message as tokens arrive
}
```

### Implementation Plan

1. **Modify main message handler** to use streaming path when `RELAY_STREAMING=1`:
```typescript
// In main relay loop, replace:
reply = await meow.prompt(fullPrompt);
const chunks = chunkMessage(reply);
await sendChunksWithRateLimit(message, chunks);

// With:
if (RELAY_STREAMING) {
  reply = await sendStreamingMessage(meow, message, fullPrompt, (token) => {
    // Real-time updates via TokenBuffer
  });
} else {
  reply = await meow.prompt(fullPrompt);
  const chunks = chunkMessage(reply);
  await sendChunksWithRateLimit(message, chunks);
}
```

2. **Add streaming detection** - If `promptStreaming()` throws, fall back to non-streaming

3. **Dogfood test** - Send message with code blocks, verify:
   - "🐱 thinking..." appears first
   - Tokens update incrementally
   - No partial fences like "```co"

## Implementation Location
- `agent-harness/src/relay.ts` - Wire `sendStreamingMessage()` into main flow
- Toggle via `RELAY_STREAMING=1` environment variable

## Status
⏳ WAITING FOR DOGFOOD VALIDATION

Epoch 7 established protections (chunking, rate limiting). Epoch 10 requires DOGFOOD to validate the streaming update integration works before proceeding to frame drop monitoring.