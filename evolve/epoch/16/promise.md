=== EPOCH PROMISE ===

## Capability to Implement
Streaming Continuation Signals + Proper Termination Events

## What It Does
Adds proper SSE streaming signals to indicate when a response needs continuation and properly terminates streams with completion events. This prevents hanging connections and enables graceful abort handling.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: needsContinuation field** - Stream events include `needsContinuation: boolean` when response is truncated/incomplete
2. **Test: Stream termination events** - `content_block_stop` and `message_stop` events are emitted at end of stream
3. **Test: Graceful abort** - When request is aborted, proper cleanup occurs without hanging
4. **Test: Backpressure handling** - Slow consumers don't cause stream to buffer indefinitely
5. **Must be reproducible** - Run streaming test to verify proper start/continue/stop cycle

## From Research: Claude Code + Cursor (Primary Sources)

### Claude Code Streaming Pattern
Claude Code emits explicit events for stream lifecycle:
```typescript
// Stream events
{ type: "content_block_start", content_block: { type: "text", text: "" } }
{ type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } }
{ type: "content_block_stop" }  // <-- Proper termination
{ type: "message_stop" }       // <-- Stream complete
```

### Cursor's Stream Handling
> "Large edits stream more smoothly after cutting dropped frames by ~87%"

Cursor's fix involved proper buffering + explicit stream boundaries:
```typescript
class StreamManager {
  private buffer: string[] = [];
  private needsContinuation = false;
  
  // Signal continuation needed
  onMaxTokensReached() {
    this.needsContinuation = true;
    this.emit({ type: "needsContinuation", value: true });
  }
  
  // Proper termination
  onComplete() {
    this.flush();
    this.emit({ type: "content_block_stop" });
    this.emit({ type: "message_stop" });
  }
}
```

### Meow's Current State (from CAPABILITY_STATUS.md)
| Gap | Status | Evidence |
|-----|--------|----------|
| needsContinuation field | ❌ MISSING | STREAM-001 shows MISSING |
| Stream termination events | ❌ MISSING | STREAM-004 shows MISSING |
| TokenBuffer class | ✅ EXISTS | Code fence aware, unused |
| promptStreaming() | ✅ EXISTS | In meow-run.ts |

### Implementation Approach

1. **Add needsContinuation to StreamEvent type**:
```typescript
// src/sidecars/streaming.ts
interface StreamEvent {
  type: "content_block_start" | "content_block_delta" | "content_block_stop" | "message_stop" | "needsContinuation";
  needsContinuation?: boolean;
  // ... other fields
}
```

2. **Emit proper termination events**:
```typescript
// In runLeanAgentSimpleStream()
onComplete() {
  this.tokenBuffer.flush();
  this.emit({ type: "content_block_stop" });
  this.emit({ type: "message_stop" });
}

onMaxTokensReached() {
  this.needsContinuation = true;
  this.emit({ type: "needsContinuation", value: true });
}
```

3. **Add abort handling**:
```typescript
// Handle abort signal
req.signal?.addEventListener("abort", () => {
  this.emit({ type: "content_block_stop" });
  this.emit({ type: "message_stop" });
  this.cleanup();
});
```

4. **Add backpressure handling**:
```typescript
// Slow consumer protection
private writeQueue: string[] = [];
private highWaterMark = 100;

async write(token: string) {
  if (this.writeQueue.length > this.highWaterMark) {
    await this.drain(); // Wait for consumer to catch up
  }
  this.writeQueue.push(token);
}
```

### Research Sources
- https://docs.anthropic.com/en/docs/claude-code - Claude Code streaming events
- https://cursor.com/changelog (Apr 15, 2026) - Cursor streaming fix
- agent-kernel/src/sidecars/streaming.ts - TokenBuffer (exists but unused)
- agent-kernel/src/core/lean-agent.ts - runLeanAgentSimpleStream()
- CAPABILITY_STATUS.md - STREAM-001, STREAM-004 gaps

## Implementation Location
- `agent-kernel/src/sidecars/streaming.ts` - Add StreamEvent types + needsContinuation
- `agent-kernel/src/core/lean-agent.ts` - Add termination event emission
- `src/meow-run.ts` - Wire up streaming with proper signals

## Status
✅ **VALIDATED** by DOGFOOD (2026-04-24)
- All 18 tests passed
- needsContinuation field: PRESENT
- Stream termination events: 13 occurrences each of content_block_stop and message_stop
- Graceful abort handling: IMPLEMENTED
- Backpressure handling: highWaterMark, writeQueue, drain(), isBackpressure(), getQueueDepth() all PRESENT

**EVOLVE can proceed to next epoch.**

Epoch 16 builds on Epoch 9 (Real-Time Token Buffering) by adding proper stream lifecycle management: continuation signals, termination events, and abort handling.
