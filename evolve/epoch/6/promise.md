=== EPOCH PROMISE ===

## Capability to Implement
Root Cause Analysis + Cross-Agent Bug Pattern Confirmation

## What It Does
Confirmed that the flash/freeze bug is a cross-agent pattern affecting Cursor, Claude Code, Windsurf, and Meow. Documented root cause chain and verified Meow's TokenBuffer as the solution.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: Root cause chain documented** - Complete chain from streaming to flash/freeze
2. **Test: Cross-agent confirmation** - Bug affects multiple systems, not just Meow
3. **Test: Solution identified** - TokenBuffer class exists but needs integration
4. **Must be reproducible** - See implementation in epochs 7-9

## From Research: Root Cause Analysis

### Bug Pattern (Cross-Agent)

```
Streaming LLM Output (~50-100 chars/sec)
        ↓
Per-token writes (no buffering)
        ↓
Special chars: ``` arrive as: `, `, `, n, e, w...
        ↓
Code fence detected MID-TOKEN
        ↓
Flash/freeze: overlapping cursors, dropped frames
```

### Affected Systems

| System | Manifestation | Primary Fix |
|--------|--------------|-------------|
| Cursor | Agent convos flash/freeze | Apr 15: Limited diff fetches, lazy updates |
| Claude Code | Long convos hang | Graceful abort, session compaction |
| Windsurf | Code-heavy outputs lag | Cascade buffering |
| Meow | Same issue | TokenBuffer (exists, needs integration) |

### Solution Pattern

**Meow's TokenBuffer** (exists in `agent-kernel/src/sidecars/streaming.ts`):
- Flushes every 20 chars OR 50ms
- Code fence aware option available
- Used by `runAgentStream()` but NOT main relay flow

**Missing:** Integration into main relay flow

## Implementation Status
- Research: ✅ COMPLETED (Iteration 6)
- Implementation: See epochs 7-9

## Related Epochs
- Epoch 7: Implements protections (chunking + rate limiting)
- Epoch 9: Implements streaming integration