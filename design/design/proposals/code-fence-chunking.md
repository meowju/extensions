# Design Proposal: Streaming Progress Indicator
## Validated Capability: Code Fence Aware Chunking + Rate-Limited Sending

**Epoch:** 7  
**Status:** VALIDATED (2026-04-24T21:15:00Z)  
**File:** `/app/dogfood/validation/epoch-7-code-fence-chunking.json`  
**Date:** 2026-04-24

---

## 1. Problem Statement

Without streaming progress visibility, users see:
- "Flash/freeze" behavior where no output appears then suddenly everything
- No indication of chunk processing or rate limiting
- Cannot assess if agent is stuck or still processing

The validated `code fence aware chunking` capability prevents partial fences (e.g., `\`\`\`co`) but users need to know this is happening.

---

## 2. Design Targets

### 2.1 StreamingProgressIndicator Component

**UI Components:**
- `ChunkProgressBar` - Shows chunks sent vs total
- `FenceIntegrityBadge` - Visual indicator that fences stay intact
- `RateLimitIndicator` - Shows inter-chunk delay (100ms)
- `TokenBudgetDisplay` - Current tokens / limit with percentage

**Visual States:**
```
IDLE: "Ready" badge
PROCESSING: "Streaming..." with animated pulse
CHUNK_N: "Chunk 3/12" with progress bar
FENCE_COMPLETE: "``` code block complete" ✓
COMPLETE: "Response complete" ✓
```

### 2.2 API Extensions

```typescript
interface StreamingProgressCallback {
  onChunkStart(chunkIndex: number, totalChunks: number): void;
  onChunkComplete(chunkIndex: number, tokensInChunk: number): void;
  onFenceIntegrityCheck(fenceType: string, intact: boolean): void;
  onRateLimitDelay(ms: number): void;
  onStreamingComplete(totalTokens: number, durationMs: number): void;
}
```

### 2.3 Implementation Checklist

- [ ] `StreamingProgressIndicator` React component
- [ ] `useStreamingProgress` hook for state management
- [ ] WebSocket event subscription for streaming events
- [ ] Mobile: compact `StreamingStatusChip` with expandable details
- [ ] Escape hatch: "Skip rate limit" toggle for power users
- [ ] `ChunkProgressBar` with percentage and ETA

### 2.4 Mobile Considerations

| Element | Desktop | Mobile |
|---------|---------|--------|
| Progress bar | Full width, 8px height | 60% width, 6px height |
| Fence badge | Inline with progress | Floating indicator top-right |
| Expandable panel | Click to expand | Tap to expand modal |
| Rate limit info | Always visible | "More" dropdown |

---

## 3. Implementation Notes

Based on validation evidence:
- `CHUNK_DELAY_MS = 100` in relay.ts
- `chunkMessageCodeFenceAware()` splits at code fences first
- Long code blocks (3000+ chars) split at newlines but fences preserved

Display rate limit delay as: `"Rate: ~100ms/chunk"`

---

## 4. Non-Blocking Pattern

The progress indicator MUST be:
- **Non-blocking:** Does not prevent user interaction
- **Progressive:** Basic status → expand for details
- **Dismissible:** User can collapse or minimize
- **Escalatable:** Click to see full chunk breakdown

---

## 5. Dependencies

- `sendChunksWithRateLimit()` function from relay.ts
- Token budget tracking from context management
- WebSocket events for real-time updates