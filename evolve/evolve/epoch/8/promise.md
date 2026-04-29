=== EPOCH PROMISE ===

## Capability to Implement
Cross-Agent Streaming Bug Pattern Documentation + TokenBuffer Code Fence Awareness

## What It Does
Documented the complete cross-agent flash/freeze bug pattern affecting Cursor, Claude Code, Windsurf, Copilot Workspace, and Meow. Verified that Meow's relay.ts has the protections (iteration 7 fix) but the underlying agent loop is non-streaming, missing real-time token display.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: Bug pattern documented** - Cross-agent bug pattern documented in `evolve/research/iteration-8-cross-agent-bug-pattern-2026-04-24.md`
2. **Test: Streaming infrastructure exists but unused** - `agent-kernel/src/sidecars/streaming.ts` has TokenBuffer with code fence awareness, but relay.ts uses non-streaming `runLeanAgent()`
3. **Test: Implementation status matrix verified** - All P0 fixes done (chunking, rate limiting), P1 gaps documented (streaming, frame monitoring)
4. **Must be reproducible** - See `streaming-bug-deep-dive-2026-04-24.md` for full test pattern

## From Research: Cross-Tool Synthesis

### Bug Pattern (Confirmed from Cursor)
**Bug Name:** Cross-Agent Code Block Flash/Freeze

**Root Cause Chain:**
```
Streaming LLM Output (~50-100 chars/sec)
        ↓
Per-token writes (no buffering)
        ↓
Special chars arrive: `, `, `, n, e, w...
        ↓
Code fence detected MID-TOKEN → markdown confusion
        ↓
Flash/freeze: overlapping cursors, dropped frames
```

### Cursor's Fix (Apr 15, 2026)
1. Limited local diff fetches (batching)
2. Lazy update pattern (not every token)
3. Code block aware flushing (at ``` boundaries)
4. Frame drop monitoring (dynamic adjustment)

### Meow's Current State
| Protection | Status | Source |
|------------|--------|--------|
| Code fence aware chunking | ✅ DONE | relay.ts iteration 7 |
| Rate-limited sending | ✅ DONE | relay.ts iteration 7 |
| TokenBuffer class | ✅ EXISTS | streaming.ts |
| Grace iteration on limit | ✅ DONE | lean-agent.ts |
| Session compaction | ✅ EXISTS | compactMessages() |

### Remaining Gaps (P1)
| Gap | Impact | Fix Needed |
|-----|--------|------------|
| Non-streaming agent loop | No real-time display | Use runLeanAgentSimpleStream() |
| TokenBuffer unused | Core streaming infra not integrated | Integrate into meow-run.ts |
| No frame monitoring | Can't adapt to slow renders | Add timing tracking |

## Implementation Location
- `agent-harness/src/relay.ts` - Main relay (protected by iteration 7)
- `agent-kernel/src/sidecars/streaming.ts` - TokenBuffer (exists but unused)
- `agent-kernel/src/core/lean-agent.ts` - Streaming variants (exists)

## Status
✅ DOCUMENTED in Iteration 8