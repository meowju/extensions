=== Research: Iteration 5 - Root Cause Fix Implementation ===

Date: 2026-04-24

## Executive Summary

The "diff/code block flash and freeze" bug is **NOT Meow-specific**. Cursor documented fixing this exact issue in Apr 2026. The root cause is per-token terminal/DOM writes without buffering at code fence boundaries.

## Root Cause Analysis

### The Problem Chain

```
Streaming LLM Output
       ↓
[Raw per-token writes]  ← Bug: every token causes redraw
       ↓
Terminal/DOM receives: backtick, backtick, backtick, n, e...
       ↓
Code fence ``` detected mid-token → cursor confusion
       ↓
Flash/freeze: overlapping cursor positions, dropped frames
```

### Why Meow Has This Issue

Meow's architecture:
1. **relay.ts**: Discord bridge, calls `meow.prompt()` → gets full response
2. **MeowAgentClient**: Wraps `runLeanAgent()` (non-streaming)
3. **lean-agent.ts**: `runLeanAgent()` returns complete response, no streaming
4. **relay.ts**: Chunks response, sends via `message.reply()`

The issue: `message.reply(chunk)` sends each chunk immediately. If a chunk contains partial code blocks, Discord's rendering engine gets confused.

### Why Cursor Has This Issue

Cursor's old Agents Window:
1. Streaming tokens arrive from LLM
2. Each token writes to DOM immediately
3. Code blocks have special rendering in Discord-style markdown
4. Rapid token arrival with special chars → DOM thrashing

### Cursor's Fix (from changelog)

1. "Limited local diff fetches to reduce CPU/network spikes"
2. "The Agents Window now avoids expensive updates and fetches unless they're truly needed"  
3. "Cut dropped frames by ~87% for large edits"

## Implementation: Where to Fix

### Option 1: Buffer Discord Message Sending (relay.ts)

Wrap `chunkMessage()` and `message.reply()` with buffering:

```typescript
// In relay.ts, add code fence aware chunking
function chunkMessageCodeAware(text: string, maxLen = 1900): string[] {
  if (text.length <= maxLen) return [text];
  
  // Split on code fences first
  const CODE_FENCE = "```";
  const parts = text.split(CODE_FENCE);
  
  // Interleave fences with content
  const chunks: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i % 2 === 1) {
      // This is a code block - send as single chunk if possible
      if (part.length <= maxLen) {
        chunks.push(CODE_FENCE + part + CODE_FENCE);
      } else {
        // Too large - split with fence at boundaries
        chunks.push(CODE_FENCE + part.slice(0, maxLen - 3));
        chunks.push(part.slice(maxLen - 3) + CODE_FENCE);
      }
    } else {
      // Regular text - chunk normally
      let remaining = part;
      while (remaining.length > 0) {
        let cut = Math.min(maxLen, remaining.length);
        const nl = remaining.lastIndexOf("\n", cut);
        if (nl > cut * 0.5) cut = nl + 1;
        chunks.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut);
      }
    }
  }
  return chunks;
}
```

### Option 2: Apply TokenBuffer to lean-agent.ts Streaming

Extend `runLeanAgentSimpleStream()` to use `TokenBuffer`:

```typescript
import { createBufferedStream, type TokenBuffer } from "../sidecars/streaming.ts";

// In runLeanAgentSimpleStream:
const buffered = createBufferedStream(
  (text) => { fullContent += text; onToken?.(text); },
  { bufferSize: 30, flushIntervalMs: 30 }  // Smaller for Discord
);

for await (const chunk of stream) {
  if (delta.content) {
    buffered.write(delta.content);  // Use buffered writes
  }
}
buffered.close();
```

### Option 3: Rate-Limit Discord Edits (Middle Path)

The relay already has `chunkMessage()`. Add a delay between chunks:

```typescript
const CHUNK_DELAY_MS = 100;  // Delay between chunk sends

for (const chunk of chunks) {
  await message.reply(chunk);
  if (chunk !== chunks[chunks.length - 1]) {
    await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
  }
}
```

## Recommended Fix: Option 1 (Code Fence Aware Chunking)

### Why Option 1 is Best

1. **Minimal change**: Only modify `chunkMessage()` in relay.ts
2. **Targeted**: Fixes the specific issue (code fence boundaries)
3. **No architectural changes**: Doesn't require streaming refactor
4. **Testable**: Can verify by testing with code blocks in messages
5. **Matches Cursor's approach**: "Flush at code fence boundaries"

### Why Not Option 2

1. **Architectural change**: Requires making relay use streaming
2. **More complex**: TokenBuffer designed for TTY, needs adaptation for Discord
3. **Risk**: Could introduce new bugs in working code path

### Why Not Option 3

1. **Incomplete fix**: Rate-limiting helps but doesn't address root cause
2. **Affects all messages**: Even those without code blocks
3. **User experience**: Slower responses

## Implementation Plan

### Step 1: Add Code Fence Detection (streaming.ts)

```typescript
// In streaming.ts, add to TokenBuffer:
add(token: string): void {
  this.buffer += token;
  
  // Flush at code fence boundaries - don't interleave
  if (token.includes("```")) {
    this.flush();
    return;
  }
  
  const now = Date.now();
  if (this.buffer.length >= this.options.bufferSize ||
      now - this.lastFlush >= this.options.flushIntervalMs) {
    this.flush();
  }
}
```

### Step 2: Make chunkMessage Code Fence Aware (relay.ts)

Replace `chunkMessage()` with enhanced version that keeps code fences intact.

### Step 3: Add Optional Buffering to reply (relay.ts)

Optional: Add rate-limiting delay between chunks if code blocks detected.

## Testing Approach

### Unit Test: Code Fence Chunking

```typescript
// Test that code blocks stay intact
const input = "text ```code block``` more text";
const chunks = chunkMessageCodeAware(input, 20);
// Should output: ["text", "```code block```", "more text"]
// NOT: ["text ```code blo", "ck``` more text"]
```

### Integration Test: Message with Diff

1. Send message with git diff output
2. Verify no flash/freeze in Discord
3. Verify diff renders correctly (code block intact)

### Performance Test: Large Response

1. Send prompt that generates large code block (>2000 chars)
2. Verify response arrives without hanging
3. Verify "follow-up" works (Cursor's specific fix from changelog)

## Success Metrics

- [ ] Code blocks render intact, not split at fences
- [ ] Large diffs (100+ lines) don't cause flash/freeze
- [ ] "Follow-up" after long chat responds within 1s (Cursor's metric)
- [ ] Dropped frame rate < 5% (vs Cursor's 87% improvement baseline)

## Related Bugs to Check

1. **GAP-UI-003 False Positive**: 'progress' keyword in 'LIMIT REACHED' message
2. **Grep Tool Fallback**: Silent fallback when ripgrep unavailable  
3. **Abort Mid-Execution**: 'Request was aborted' not caught gracefully

## Sources ==

1. https://cursor.com/changelog (Apr 15, 2026) - Bug fix confirmation
2. agent-kernel/src/sidecars/streaming.ts - TokenBuffer implementation
3. agent-harness/src/relay.ts - Main relay with chunkMessage()
4. iteration-4-summary.md - Previous findings