# Streaming UX Enhancement

**Priority:** P1 (High)  
**Status:** Proposed  
**Created:** 2026-04-24

---

## Problem Statement

Current Meow streaming (`runLeanAgentSimpleStream`) delivers tokens in chunks via `onToken` callback, but:
- No token buffering for smooth animation
- No partial render handling (words appearing mid-token)
- No frame-drop monitoring for slow connections
- No streaming state indicator (cursor animation vs static)

**Reference:** Hermes Agent delivers streaming tool output with real-time display of command results. Cursor animation during thinking, smooth word reveal during generation.

---

## Dogfood Validation Findings

**EPOCH 16 (Streaming Continuation Signals)** — ✅ VALIDATED
- `needsContinuation` field in StreamEvent works
- `content_block_stop` and `message_stop` events emitted correctly  
- Backpressure handling with `highWaterMark` and `writeQueue` exists

**EPOCH 17 (Rich Agent State Indicators)** — ❌ NOT IMPLEMENTED
- Missing `WAITING` state in AgentState enum
- Relay integration for state indicators is incomplete
- Only 4 states defined (thinking, executing, complete, error) vs target of 5+

**Fix needed:**
1. Add `WAITING` state to AgentState enum
2. Add state indicator rendering in relay.ts
3. Add state callback handling in relay.ts

---

## Target State

```
Thinking... [animated cursor]
Generating... [token-by-token reveal with word-boundary snapping]
Executing: git status [streaming stderr stdout]
Done. [static]
```

---

## Implementation Ideas

### 1. TokenBuffer Class
```
TokenBuffer {
  - buffer: string[] (partial tokens)
  - flushInterval: 50ms (configurable)
  - wordBoundary: /\s+/ (snap to words)
  
  method add(token: string): void
  method flush(): string (returns completed words)
  method drain(): string (returns all remaining)
}
```

### 2. Frame Drop Monitor
```
FrameMonitor {
  - targetFPS: 30
  - frameTimes: number[]
  - dropThreshold: 2 frames behind
  
  method recordFrame(): void
  method isDropping(): boolean
  method adaptQuality(): void // reduce animation fidelity
}
```

### 3. State Machine for Streaming

```
enum StreamState {
  IDLE → THINKING → GENERATING → EXECUTING → COMPLETE
}

onStateChange callback already exists in lean-agent.ts
Need: TokenBuffer integration in meow-stream.ts
```

---

## Files to Modify

1. `agent-kernel/src/core/streaming-buffer.ts` (new)
2. `agent-kernel/src/core/frame-monitor.ts` (new)
3. `src/core/meow-agent.ts` (integrate buffer)
4. `agent-kernel/src/types/agent-state.ts` (extend states)

---

## Acceptance Criteria

- [ ] Tokens buffer and flush on word boundaries
- [ ] Cursor animation during THINKING state
- [ ] Frame drop detection when >2 frames behind
- [ ] Graceful degradation on slow connections
- [ ] Streaming state visible in output

---

## Related Proposals

- `hooks.md` - Hooks can trigger streaming optimizations
- `tui.md` - TUI requires proper streaming foundation