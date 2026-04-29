=== EPOCH PROMISE ===

## Capability to Implement
Code Fence Aware Chunking + Rate-Limited Sending

## What It Does
Prevents the "diff/code block flash and freeze" bug by keeping code fences (```) intact during message chunking and spacing out Discord messages with 100ms delays.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: No partial fences** - `chunkMessageCodeFenceAware("```js\ncode\n```")` returns single chunk with fences intact, NOT `["```", "js..."]` split at fence
2. **Test: Rate limiting works** - `sendChunksWithRateLimit()` adds 100ms delay between chunks (verify via timing)
3. **Test: Long code blocks split safely** - Very long code blocks are split at newlines but keep opening/closing fences
4. **Must be reproducible** - Run `bun test` to confirm no flash/freeze with code-heavy outputs

## From Research: Cursor (Primary Source)
**Who has this pattern:** Cursor IDE (Apr 15, 2026 changelog)
**How they do it:**
1. Limited local diff fetches (reduced CPU spikes by batching)
2. Lazy update pattern ("avoids expensive updates unless truly needed")
3. Code block aware flushing (flush at ``` boundaries)
4. Frame drop monitoring (track/dynamically adjust buffer)

**Meow implementation from Cursor pattern:**
```typescript
// relay.ts
const CODE_FENCE = "```";
const CHUNK_DELAY_MS = 100;

function chunkMessageCodeFenceAware(text: string, maxLen = 1900): string[] {
  // Split by fences first, keep them intact
  // Then chunk remaining text on newlines
  // Long code blocks split inside but fences stay closed
}

async function sendChunksWithRateLimit(message, chunks) {
  for (const chunk of chunks) {
    await message.reply(chunk);
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
    }
  }
}
```

**Secondary sources:**
- Claude Code: Graceful abort + session compaction
- Windsurf: Cascade buffering + backpressure
- Copilot: Task planning + chunked streaming

## Implementation Location
- `agent-harness/src/relay.ts` - chunkMessageCodeFenceAware() + sendChunksWithRateLimit()

## Status
✅ IMPLEMENTED in Iteration 7