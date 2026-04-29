# Context Mode: 98% Context Reduction

**Priority:** P0 - BLOCKING (Competitor gap: context-mode has this, Meow doesn't)  
**Created:** 2026-04-25  
**Status:** DISCOVERED

## What context-mode Does

From `mksglu/context-mode` analysis:

### The Problem
Tool outputs are massive. A single `grep` or `read` can produce 100KB+. After 10 tools, context is polluted with output that's only needed for ONE step.

Example:
```
Tool output: 315KB of file contents
Actually needed: 5.4KB (the answer)
Waste: 98%
```

### The Solution
1. **Sandbox tool outputs** - Store in separate buffer, not in LLM context
2. **Session compaction** - After conversation, summarize and compress
3. **FTS5 index** - Full-text search over compacted sessions
4. **`--continue` flag** - Restore exact state after compaction

### Architecture

```
┌─────────────────────────────────────────────────┐
│ Tool Execution                                  │
│  - Run tool, capture output                     │
│  - Store output in sandbox (not context)         │
│  - Return only reference ID to LLM              │
│                                                 │
│  Output: "Found 3 matches in [ref:abc123]"       │
│  Sandbox: { abc123: "315KB of file contents" }  │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│ Session Compaction (triggered at threshold)      │
│  - Summarize conversation with LLM             │
│  - Keep key facts, decisions, partial results   │
│  - Archive full tool outputs to FTS5 index      │
│  - BM25 index for retrieval                      │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│ Continue (--continue flag)                       │
│  - Restore: summarized context + FTS5 index     │
│  - On-demand retrieval via ctx_search tool       │
│  - Agent can query past tool outputs            │
└─────────────────────────────────────────────────┘
```

### Key Metrics
- Tool output: 315KB → 5.4KB (98% reduction)
- Session continuity preserved via FTS5
- BM25 retrieval for accessing archived content

## Meow Gap Analysis

Current Meow state:
- ❌ No tool output sandboxing
- ❌ Full tool outputs in context
- ❌ No session compaction
- ❌ No `--continue` functionality
- ❌ No FTS5 skill/index integration
- ⚠️ Basic token counting in `compactMessages()`

## Architecture Proposal

### Phase 1: Tool Output Sandboxing (P0)

```typescript
// agent-kernel/src/sidecars/tool-sandbox.ts

interface ToolSandbox {
  outputs: Map<string, ToolOutput>;  // ref -> full output
  maxSize: number;  // Max to keep in memory
  onDisk: string;   // Path for overflow
}

interface ToolOutput {
  ref: string;
  tool: string;
  args: Record<string, unknown>;
  output: string;  // Full output
  size: number;
  timestamp: number;
}

export function sandboxToolOutput(
  tool: string,
  args: Record<string, unknown>,
  output: string
): { ref: string; summary: string } {
  const ref = generateRef();
  const sandbox.outputs.set(ref, { ref, tool, args, output, size: output.length, timestamp: Date.now() });
  
  // Generate summary for LLM
  const summary = summarize(output);
  
  // Evict if over limit
  if (sandbox.outputs.size > MAX_CONCURRENT) {
    evictToDisk();
  }
  
  return { ref, summary };
}
```

### Phase 2: Session Compaction (P1)

```typescript
// agent-kernel/src/sidecars/session-compactor.ts

interface CompactionResult {
  summary: string;
  ftsIndex: string;  // Path to FTS5 db
  keyFacts: string[];
}

export async function compactSession(
  messages: Message[],
  options: { threshold?: number } = {}
): Promise<CompactionResult> {
  const threshold = options.threshold ?? 100000;  // tokens
  
  // Check if compaction needed
  const totalTokens = estimateTokens(messages);
  if (totalTokens < threshold) {
    return { summary: "", ftsIndex: "", keyFacts: [] };
  }
  
  // 1. Archive tool outputs to FTS5
  const ftsIndex = await archiveToFTS5(sandbox.outputs);
  
  // 2. Generate summary with LLM
  const summary = await summarizeConversation(messages);
  
  // 3. Extract key facts
  const keyFacts = extractKeyFacts(messages);
  
  // 4. Replace messages with compact version
  return { summary, ftsIndex, keyFacts };
}
```

### Phase 3: Continue Mode (P2)

```bash
# meow --continue
# Restores:
# - Compacted summary context
# - FTS5 index for retrieval
# - Skill tree state
```

```typescript
// New tool: ctx_search
const ctxSearchTool = {
  name: "ctx_search",
  description: "Search archived session content via FTS5",
  execute: async (args: { query: string }) => {
    const results = await fts5Search(args.query, sandbox.ftsIndex);
    return results;
  }
};
```

### Phase 4: Tool Output Hooks (P1)

context-mode uses 4 hooks. Meow should support similar:

```typescript
interface ToolHooks {
  beforeTool?: (tool: string, args: Record<string, unknown>) => void;
  afterTool?: (tool: string, args: Record<string, unknown>, result: string) => void;
  onCompact?: (summary: CompactionResult) => void;
  onContinue?: () => void;
}
```

## Comparison with Current compactMessages()

Meow has `compactMessages()` but it's basic:

```typescript
// Current - just truncates
function compactMessages(messages, maxTokens) {
  // Remove middle messages
  // Keeps system + recent
}
```

Need to replace with:
1. Tool output sandboxing (not just truncation)
2. LLM-powered summarization
3. FTS5 archiving for retrieval
4. `--continue` restoration

## Sources
- https://github.com/mksglu/context-mode
- https://github.com/mksglu/context-mode/blob/main/src/tools/ctx_search.ts
