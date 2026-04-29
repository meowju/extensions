=== EPOCH PROMISE ===

## Capability to Implement
Real-Time Token Buffering for Meow Relay

## What It Does
Integrate the existing `TokenBuffer` (with code fence awareness) into Meow's main relay flow to enable real-time token display instead of waiting for complete responses.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: TokenBuffer integration** - Write test that `relay.ts` uses streaming path with `TokenBuffer`, not just `runLeanAgent()`
2. **Test: Code fence boundaries** - Verify TokenBuffer flushes at ``` boundaries (preventing partial fences)
3. **Test: Rate adaptive flushing** - Buffer respects flushIntervalMs (50ms) and bufferSize (20 chars)
4. **Must be reproducible** - Run `bun test` and verify streaming works end-to-end

## From Research: Cross-Tool Synthesis

### The Gap (Iteration 8 Findings)

| Component | Status | Location |
|-----------|--------|----------|
| TokenBuffer class | ✅ EXISTS | `agent-kernel/src/sidecars/streaming.ts` |
| Code fence awareness | ✅ EXISTS | TokenBuffer.codeFenceAware option |
| relay.ts chunking | ✅ EXISTS | `chunkMessageCodeFenceAware()` in relay.ts |
| Rate limiting | ✅ EXISTS | `sendChunksWithRateLimit()` in relay.ts |
| **Main relay flow** | ❌ NON-STREAMING | `runLeanAgent()` returns complete response |
| **Streaming path** | ❌ NOT INTEGRATED | TokenBuffer unused in relay.ts |

### Root Cause

Current relay.ts flow:
```
Discord Message
        ↓
relay.ts: buildContextPrompt()
        ↓
meow.prompt(fullPrompt) → MeowAgentClient.prompt()
        ↓
spawn meow-run.ts → spawn lean-agent.ts → runLeanAgent()
        ↓
runLeanAgent() returns COMPLETE response (non-streaming)
        ↓
relay.ts: chunkMessage(reply) → sendChunksWithRateLimit()
        ↓
Discord messages sent (safe from flash/freeze)
```

**Problem:** User sees NOTHING until complete response (can be 30+ seconds)

### Solution Pattern (From Claude Code)

Claude Code uses SSE (Server-Sent Events) for streaming:
```typescript
// Claude Code streaming pattern
for await (const chunk of stream) {
  processChunk(chunk);  // Real-time updates
}
```

Meow already has the infrastructure:
- `runLeanAgentSimpleStream()` in lean-agent.ts
- `TokenBuffer` with code fence awareness in streaming.ts

**Missing:** Integration into meow-agent.ts and relay.ts

### Implementation Plan

1. **meow-agent.ts** - Add streaming variant `promptStreaming()`:
```typescript
async promptStreaming(
  prompt: string,
  onToken: (token: string) => void
): Promise<string>
```

2. **relay.ts** - Add streaming message update path:
```typescript
// Start with "thinking..." status message
// Update as tokens arrive (via TokenBuffer)
// Finalize with complete message
```

3. **Dogfood test** - Verify streaming works end-to-end:
```typescript
test("streaming token display works", async () => {
  const tokens: string[] = [];
  await meow.promptStreaming("Show me some code", (token) => {
    tokens.push(token);
  });
  expect(tokens.length).toBeGreaterThan(0);
});
```

## Implementation Location
- `agent-harness/src/core/meow-agent.ts` - Add streaming prompt method
- `agent-harness/src/relay.ts` - Add streaming path
- `agent-harness/dogfood/` - Add streaming integration test

## Status
⏳ WAITING FOR DOGFOOD VALIDATION

Epoch 7 and 8 established the bug pattern and implemented protections. Epoch 9 requires DOGFOOD to validate the TokenBuffer integration works before proceeding to streaming path implementation.