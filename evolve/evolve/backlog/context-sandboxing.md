# Backlog: Context Sandboxing & Session Continuity

**Priority:** P0 - BLOCKING  
**Created:** 2026-04-25  
**Status:** CANDIDATE

---

## Problem Statement

Meowju dumps all tool output directly into context. A Playwright snapshot costs 56KB. After 30 minutes, 40% of context is tool output noise. When session compacts, Meowju forgets which files it was editing and what tasks are in progress.

context-mode achieves 98% reduction (315KB → 5.4KB) and maintains session continuity via FTS5.

---

## Evidence from Competitors

### context-mode (mksglu/context-mode)
**Architecture:**
1. **Sandbox tools**: Tool output goes to SQLite, not context
2. **FTS5 index**: All events indexed for semantic search
3. **Session continuity**: `--continue` restores exact state after compaction
4. **Think in Code paradigm**: Agent writes scripts, executes, logs result

**Metrics:**
- 315KB tool output → 5.4KB sandboxed
- 98% context reduction
- 12 platforms supported

**Tools provided:**
- `ctx_batch_execute`: Batch operations, sandbox results
- `ctx_execute`: Single execution, sandbox result
- `ctx_execute_file`: Execute script file, log output
- `ctx_index`: Index content into FTS5
- `ctx_search`: BM25 search across indexed content
- `ctx_stats`: Show context savings

**Source:** https://github.com/mksglu/context-mode

### GenericAgent Memory Layers
- Layered memory ensures right knowledge in scope
- <30K context window vs 200K-1M competitors
- Memory compressed to fit

---

## Meowju's Current State

Based on validation logs:
- Session compaction via LLM summarization exists (epoch 11)
- MemoryStore has `compactThread()`, `needsCompaction()`, `getThreadContext()`
- Tool output goes directly to context
- No tool output sandboxing
- No FTS5 index
- No `--continue` mechanism

**epoch-11-session-compaction.json verdict:** VALIDATED
- But focuses on compression, not sandboxing

---

## Required Implementation

### Phase 1: Tool Output Sandboxing
```typescript
// src/sandbox/tool-sandbox.ts

import Database from 'better-sqlite3';

interface ToolOutput {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  result: unknown;
  size: number;
  timestamp: Date;
}

class ToolSandbox {
  private db: Database;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS tool_outputs 
      USING fts5(id, tool, content, content='');
    `);
  }
  
  async sandbox<T>(
    tool: string,
    params: Record<string, unknown>,
    fn: () => Promise<T>
  ): Promise<T> {
    const result = await fn();
    
    // Store full result in SQLite
    const id = uuid();
    const output: ToolOutput = {
      id,
      tool,
      params,
      result,
      size: JSON.stringify(result).length,
      timestamp: new Date(),
    };
    
    // Index for search
    this.db.prepare(`
      INSERT INTO tool_outputs (id, tool, content) VALUES (?, ?, ?)
    `).run(id, tool, JSON.stringify(result));
    
    return result;
  }
  
  search(query: string, limit = 10): ToolOutput[] {
    // BM25 search
    const rows = this.db.prepare(`
      SELECT id, tool FROM tool_outputs 
      WHERE content MATCH ?
      LIMIT ?
    `).all(query, limit);
    
    return rows.map(r => this.getById(r.id));
  }
}
```

### Phase 2: Hook Integration
```typescript
// In tool execution wrapper
const output = await toolSandbox.sandbox(toolName, params, async () => {
  return originalToolCall(params);
});

// Return only summary to context
return {
  sandboxed: true,
  summary: summarizeForContext(output),
  ref: output.id,
};
```

### Phase 3: Session Continuity
```typescript
// --continue implementation
async function continueSession(): Promise<void> {
  // 1. Search FTS5 for recent context
  const recent = toolSandbox.search(lastUserQuery, { limit: 20 });
  
  // 2. Reconstruct state from sandbox
  const state = {
    filesEdited: recent.filter(o => o.tool === 'write' || o.tool === 'edit'),
    commandsRun: recent.filter(o => o.tool === 'shell'),
    errors: recent.filter(o => o.tool === 'error'),
  };
  
  // 3. Inject into context
  await injectContext({
    type: 'session_continue',
    state,
  });
}
```

---

## Metrics to Target

| Metric | Current | Target |
|--------|---------|--------|
| Tool output to context | 100% | <10% |
| Context efficiency | Baseline | 2x improvement |
| Session recovery | None | FTS5-based |

---

## Implementation Plan

| Phase | Task | Complexity |
|-------|------|------------|
| 1 | Add SQLite-based tool sandbox | Medium |
| 2 | Hook sandbox into tool execution | Medium |
| 3 | Add FTS5 index for search | Medium |
| 4 | Implement `--continue` | High |
| 5 | Add `ctx_stats`-like analytics | Low |

---

## References

- https://github.com/mksglu/context-mode
- https://www.npmjs.com/package/context-mode
