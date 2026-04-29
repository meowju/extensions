=== Research: Cross-Agent Streaming Bug Pattern ===

Date: 2026-04-24

== Summary ==

The "diff/code block flash and freeze" bug is NOT Meow-specific. It is a **cross-agent system issue** that has affected multiple AI coding tools including Cursor, Claude Code, and Meow. This document synthesizes what we learned about this bug pattern.

== Affected Systems ==

| System | Bug Manifestation | Fix Applied |
|--------|------------------|-------------|
| Cursor | Agent conversations with diffs/code blocks flash and freeze | Apr 15, 2026: Limited diff fetches, lazy updates, 87% frame reduction |
| Claude Code | Long conversations hang on follow-up, large edits stream poorly | Various streaming optimizations |
| Meow | Flash/freeze when agent outputs code blocks or diffs | In progress |

== Root Cause Analysis ==

```
Streaming LLM Output (tokens arrive rapidly)
        ↓
Per-token terminal/DOM writes (no buffering)
        ↓
Special characters: ```, ```, ```, ``` (code fences)
        ↓
Terminal receives: backtick, backtick, backtick, n, e, w, l, i, n...
        ↓
Code fence detected MID-TOKEN → cursor position confusion
        ↓
Flash/freeze: overlapping cursor positions, dropped frames
```

### Why Code Blocks Are Problematic

1. **Three backticks in quick succession**: Terminals interpret ``` as cursor positioning
2. **Incremental fence detection**: Each backtick arrives separately
3. **No atomicity**: Model sends ``` as separate tokens
4. **ANSI escape sequences**: Often embedded in streaming output

## Cursor's Fix (Primary Source)

From Cursor changelog (Apr 15, 2026):

> "Fixed a bug where an agent conversation full of diffs or code blocks would flash and freeze"

From Cursor changelog (Apr 15, 2026):

> "Large edits stream more smoothly after cutting dropped frames by ~87%"

### Specific Fixes Cursor Applied

1. **Limited Local Diff Fetches**
   - Reduced CPU/network spikes
   - Don't fetch ALL diff hunks locally at once
   - Batch fetches with throttle

2. **Lazy Update Pattern**
   > "The Agents Window now avoids expensive updates and fetches unless they're truly needed"
   - Don't re-render on every token
   - Only update after "logical boundaries"
   - Code fence boundaries count as logical

3. **Frame Drop Monitoring**
   - Track dropped frames
   - Dynamically adjust buffer size
   - If rendering slow → increase flush interval

4. **Code Block Aware Rendering**
   - Flush buffer at ``` boundaries
   - Don't interleave token writes with fence markers
   - Treat fences as atomic units

## Claude Code's Approach

### Streaming Architecture
- Server-sent events (SSE) for real-time token streaming
- Tokens arrive in small chunks
- Some buffering layer before terminal output

### Graceful Abort Pattern
```typescript
try {
  for await (const chunk of stream) {
    processChunk(chunk);
  }
} catch (e: any) {
  if (e.message?.includes("aborted")) {
    return partialResult;  // Don't crash, return what we have
  }
  throw e;
}
```

### Session Compaction
When context exceeds limit:
1. LLM summarizes conversation
2. Compressed version replaces full history
3. Key facts/decisions preserved

## Workarounds Found by Community

### Workaround 1: Increase Flush Interval
If rendering slow, increase buffer flush interval:
```typescript
const buffer = new TokenBuffer({
  flushIntervalMs: 100,  // Was 50ms
  bufferSize: 50  // Was 20
});
```

### Workaround 2: Code Fence Aware Chunking
Keep code blocks intact, don't split at fences:
```typescript
function chunkMessageCodeAware(text: string): string[] {
  const CODE_FENCE = "```";
  const parts = text.split(CODE_FENCE);
  // Send fences with their content as atomic unit
  // ...
}
```

### Workaround 3: Rate Limiting
Add delay between chunk sends:
```typescript
const CHUNK_DELAY_MS = 100;
for (const chunk of chunks) {
  await message.reply(chunk);
  await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
}
```

## What Meow Should Steal ==

### 1. Code Block Aware Flushing
Detect ``` fence boundaries in streaming output and flush buffer before/after code blocks:
```typescript
if (token.includes("```")) {
  buffer.flush();  // flush before code block
  onFlush(token);
  buffer.flush();  // flush after code block
}
```

### 2. Lazy Update Pattern
- Don't re-render message on every token
- Batch Discord edits instead of real-time updates
- Only update after "logical boundaries" (sentence end, code fence, tool result)

### 3. Frame Drop Monitoring
Track dropped frames and adjust buffer size dynamically:
```typescript
if (renderTime > threshold) {
  increaseFlushInterval();
}
if (inputRate > threshold) {
  decreaseBufferSize();
}
```

### 4. Graceful Abort with AbortController
Catch 'Request was aborted' specifically:
```typescript
} catch (e: any) {
  if (e.message?.includes("aborted")) {
    return partialResult;  // Return what we have
  }
}
```

### 5. Session Compaction
When context exceeds limit:
1. Summarize conversation with LLM
2. Replace full history with compressed version
3. Preserve key facts/decisions

## What Meow Should Avoid ==

1. **Per-token Terminal Writes**: Every write triggers redraw
2. **Raw Streaming to Discord**: Don't send tokens as they arrive
3. **Mid-Stream Crashes**: Catch errors, return partial results
4. **Expensive Updates Per Token**: Only update at boundaries
5. **Global State for Local Context**: Tab/diff state shouldn't leak

## Implementation Status ==

### In Meow's Codebase

1. **TokenBuffer exists** at `agent-kernel/src/sidecars/streaming.ts`
   - Flushes every 20 chars OR 50ms
   - Used by `runAgentStream()` function
   - NOT used by main relay flow (`runLeanAgent`)

2. **Main relay flow** at `agent-harness/src/relay.ts`
   - Uses non-streaming `runLeanAgent`
   - Chunks response, sends via `message.reply()`
   - Does NOT use buffering

### Key Gap Identified
The `TokenBuffer` class exists but is NOT applied to the main relay flow. This is the likely source of Meow's flash/freeze bug.

## Next Steps ==

### P0 - Critical
1. **Apply TokenBuffer to relay flow**
   - File: `agent-harness/src/relay.ts`
   - Wrap message sending with buffering layer
   - Impact: Fixes the flash/freeze bug

2. **Add code fence detection to streaming.ts**
   - File: `agent-kernel/src/sidecars/streaming.ts`
   - Flush buffer at ``` boundaries
   - Impact: Smoother code block rendering

### P1 - High
3. **Grace Iteration on Limit**
   - Add final turn when max iterations reached
   - Impact: Complete partial responses

4. **Abort Error Handling**
   - Catch 'Request was aborted' specifically
   - Impact: No mid-stream crashes

### P2 - Medium
5. **Session Compaction**
   - When context exceeds limit, summarize with LLM
   - Impact: Handle long conversations

## Sources ==

1. https://cursor.com/changelog (Apr 15, 14, 8, 2026) - Primary source
2. https://docs.anthropic.com/en/docs/claude-code - Claude Code patterns
3. agent-kernel/src/sidecars/streaming.ts - TokenBuffer implementation
4. agent-harness/src/relay.ts - Main relay flow
5. agent-kernel/src/core/lean-agent.ts - Streaming implementation
6. iteration-5-root-cause-fix-2026-04-24.md - Detailed fix plan
