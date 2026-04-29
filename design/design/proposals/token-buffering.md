# Design Proposal: Agent "Thinking" Indicator
## Validated Capability: Real-Time Token Buffering (TokenBuffer)

**Epoch:** 9  
**Status:** VALIDATED (2026-04-24T21:15:00Z)  
**File:** `/app/dogfood/validation/epoch-9-real-time-token-buffering.json`  
**Date:** 2026-04-24

---

## 1. Problem Statement

Without a "thinking" indicator, users see:
- Blank screen after sending message
- No indication the agent is buffering tokens
- Cannot distinguish "processing" from "network failure"
- Code fences may appear partially (e.g., `\`\`\`co`) before flush

The validated `TokenBuffer` capability provides rate-adaptive flushing with code fence awareness, but users need visibility into this buffering process.

---

## 2. Design Targets

### 2.1 ThinkingIndicator Component

**UI Components:**
- `BufferStatusBadge` - Shows buffering state
- `FenceFlushIndicator` - Visual cue when fence boundary reached
- `TokenAccumulationDisplay` - Live count of buffered tokens
- `FlushIntervalTracker` - Shows 50ms flush cycle progress

**Visual States:**
```
BUFFERING: "Buffering..." with token count badge
FENCE_WAIT: "Waiting for fence close..." (``` detected)
FLUSHING: "Flushing 20 chars..." (brief flash)
THINKING: "Thinking..." (active, pulsing)
STREAMING: "Streaming response..." (normal output)
COMPLETE: Hidden
```

### 2.2 API Extensions

```typescript
interface TokenBufferObserver {
  onBufferStart(bufferSize: number): void;
  onTokenAccumulated(count: number, content: string): void;
  onFenceBoundaryReached(fenceType: 'code' | 'math' | 'other'): void;
  onFlush(trigger: 'size' | 'interval' | 'fence', charsFlushed: number): void;
  onBufferComplete(): void;
}

interface ThinkingIndicatorConfig {
  showBufferStats: boolean;
  showFenceFlushes: boolean;
  minDisplayDuration: number; // ms to show before hiding
  throttleMs: number; // minimum time between UI updates
}
```

### 2.3 Implementation Checklist

- [ ] `ThinkingIndicator` React component
- [ ] `useTokenBufferObserver` hook
- [ ] WebSocket subscription to TokenBuffer events
- [ ] Mobile: `ThinkingChip` compact component
- [ ] Escape hatch: "Show raw buffer" debug toggle
- [ ] `FlushCycleProgress` bar (visualizes 50ms intervals)

### 2.4 Mobile Considerations

| Element | Desktop | Mobile |
|---------|---------|--------|
| Indicator position | Fixed bottom-left | Floating top-center |
| Token count | Always visible | Badge on tap |
| Fence flush cue | Toast notification | Haptic + brief flash |
| Debug toggle | Settings menu | Hidden (power users only) |

---

## 3. Implementation Notes

Based on validation evidence:
- `bufferSize: 20` chars triggers flush
- `flushIntervalMs: 50` ms minimum flush cycle
- `codeFenceAware: true` - waits for complete fence before flush
- Integration via `sendStreamingMessage()` in relay.ts

Display buffering as: `"Buffering (20 chars)"`  
Display flush as: Brief pulse with `"Flushing..."` toast

---

## 4. Non-Blocking Pattern

The thinking indicator MUST be:
- **Non-blocking:** Does not pause streaming
- **Informational:** Shows buffering, not blocking
- **Subtle:** Low visual weight, disappears on first output
- **Escalatable:** Expand to see buffer contents on hover/click

---

## 5. Edge Cases

1. **Rapid tokens:** Show "Processing fast..." if buffer never fills
2. **Stuck buffer:** Show "Buffer stalled" after 500ms without flush
3. **Fence not closed:** Show "Waiting for fence..." badge
4. **Disabled streaming:** Hide indicator entirely (fallback to polling)

---

## 6. Dependencies

- `TokenBuffer` class from `agent-kernel/src/sidecars/streaming.ts`
- `promptStreaming()` method from meow-agent.ts
- WebSocket events from `meow-stream.ts`
- `RELAY_STREAMING=1` environment flag detection