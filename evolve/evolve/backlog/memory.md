# Memory Sidecar

**Priority:** P1 (High)  
**Status:** Proposed  
**Created:** 2026-04-24

---

## Problem Statement

Meow has no persistent user memory across sessions. Each conversation starts fresh:
- No learned user preferences
- No context from previous sessions
- No cross-session recall

**Reference:** Hermes Agent uses FTS5 session search + LLM summarization for cross-session recall. Agent-curated memory with periodic nudges. Auto-learns from conversations.

---

## Target State

```
~/.agent-kernel/memory/
├── user.json       # User profile, preferences
├── context.json    # Current project context
├── learnings.json  # Learned patterns
└── sessions/       # Session summaries for search
```

---

## Implementation Ideas

### 1. Memory Store Structure

```typescript
interface MemoryEntry {
  key: string;
  value: string;
  confidence: number;  // 0-1, learned vs explicit
  source: "explicit" | "learned" | "imported";
  timestamp: number;
  expiresAt?: number;
}

interface MemoryStore {
  get(key: string): MemoryEntry | null;
  set(key: string, value: string, source?: MemoryEntry["source"]): void;
  update(key: string, fn: (entry: MemoryEntry) => MemoryEntry): void;
  search(query: string): MemoryEntry[];  // FTS5
  compact(): void;  // Remove expired, merge low-confidence
}
```

### 2. Periodic Memory Nudges

Agent periodically reminds user of learned context:
- "I remember you prefer TypeScript for new projects"
- "Last time we worked on this, we left off at X"
- "Your coding style favors functional patterns"

### 3. Session Summarization

After each session, LLM generates a summary stored in `sessions/`:
```json
{
  "date": "2026-04-24",
  "summary": "Set up new project structure, implemented auth module",
  "topics": ["project-setup", "authentication", "typescript"],
  "outstanding": "Need to add tests for auth module"
}
```

### 4. FTS5 Search

SQLite FTS5 table for session search:
```sql
CREATE VIRTUAL TABLE sessions_fts USING fts5(
  summary, topics, outstanding, outstanding NOTINDEXED outstanding
);
```

---

## Files to Create/Modify

1. `agent-kernel/src/sidecars/memory.ts` (new)
2. `agent-kernel/src/core/memory-store.ts` (new)
3. `agent-kernel/src/core/session-index.ts` (new, FTS5)
4. `agent-kernel/cli/index.ts` (integrate memory commands)

---

## Acceptance Criteria

- [ ] Key-value memory store with JSON persistence
- [ ] Learned vs explicit confidence scoring
- [ ] FTS5 session search (find past sessions by topic)
- [ ] Periodic memory nudges during conversation
- [ ] Session summarization on conversation end
- [ ] `MEOW_MEMORY=false` to disable

---

## Competition Analysis

| Feature | Hermes | Meow |
|---------|--------|------|
| Persistent memory | ✅ | ❌ |
| FTS5 search | ✅ | ❌ |
| Periodic nudges | ✅ | ❌ |
| Auto-learn | ✅ | ❌ |
| User profile | ✅ | ❌ |

---

## Related Proposals

- `streaming-ux.md` - Streaming UX for memory display
- `hooks.md` - Hooks can auto-save context to memory