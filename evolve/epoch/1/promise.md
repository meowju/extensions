=== EPOCH PROMISE ===

## Capability to Implement
Streaming Bug Investigation - Diff/Code Block Flash and Freeze

## What It Does
Deep dive investigation revealing that the diff/code block flash and freeze bug is NOT Meow-specific but affects ALL streaming agentic systems. Identified Cursor's fix pattern as the solution.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: Bug pattern confirmed** - Cross-agent streaming bug documented, affects Cursor, Claude Code, Windsurf, Meow
2. **Test: Root cause chain documented** - Per-token writes → special chars → mid-token fence detection → cursor confusion
3. **Test: Solution pattern identified** - Cursor's changelog (Apr 15, 2026) provides fix: "code block aware flushing", "lazy updates", "frame drop monitoring"
4. **Must be reproducible** - Bug is real, fix pattern confirmed, implementation needed

## From Research: Cursor (Primary Source)
**Who has this pattern:** Cursor IDE (Apr 15, 2026 changelog)

**What Cursor fixed:**
- "Large edits stream more smoothly after cutting dropped frames by ~87%"
- "Fixed bug where agent conversations with diffs/code blocks would flash and freeze"

**Root Cause:**
1. Streaming output with code blocks contains special chars (backticks, newlines)
2. Raw terminal writes don't account for ANSI cursor positioning
3. Large diffs cause buffer overflow
4. Model sends incremental output overlapping cursor position

**Meow's State:**
- `TokenBuffer` class EXISTS in streaming.ts (flushes every 20 chars or 50ms)
- BUT main relay flow uses non-streaming `runLeanAgent` - NOT using buffer

**Fix Pattern (From Cursor):**
1. **Code Block Aware Flushing** - Flush at ``` boundaries, not arbitrary char counts
2. **Lazy Updates** - "avoid expensive updates unless truly needed"
3. **Frame Drop Detection** - Monitor rendering, adjust buffer dynamically
4. **Batching** - Don't fetch all diff hunks simultaneously

## Implementation Status
- Research: ✅ COMPLETED (Iteration 4)
- Implementation: ❌ NEEDED (chunkMessageCodeFenceAware + rate limiting)

## Gap Identified
TokenBuffer exists but NOT applied to main relay flow. This is the source of Meow's flash/freeze bug.

## Related Epochs
- Epoch 7: Implements the fix (Code Fence Aware Chunking + Rate-Limited Sending)
- Epoch 8: Documents full bug pattern and implementation status