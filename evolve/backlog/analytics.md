# Analytics Sidecar

**Priority:** P4 (Low)  
**Status:** Proposed  
**Created:** 2026-04-24

---

## Problem Statement

No usage tracking or insights:
- Unknown token usage per session
- No tool usage frequency data
- No error rate tracking
- No way to optimize usage

**Reference:** TODO.md Phase 5.3 describes analytics sidecar with opt-in anonymous aggregate metrics.

---

## Target State

```bash
$ meow --stats
Session Stats:
- Tokens: 12,345 (prompt: 8,200 | completion: 4,145)
- Cost: $0.023
- Tools used: read(3), write(2), shell(5)
- Errors: 0
- Duration: 45s

Lifetime Stats:
- Sessions: 127
- Total tokens: 1.2M
- Total cost: $2.34
- Top tools: shell, read, write
```

---

## Implementation Ideas

### 1. Metrics Collection

```typescript
interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  costEstimate: number;
  toolUsage: Map<string, number>;
  errorCount: number;
  completed: boolean;
}
```

### 2. Persistence

```typescript
// .agent-kernel/analytics/
// ├── sessions/
// │   ├── 2026-04-24_abc123.json
// │   └── 2026-04-24_def456.json
// └── summary.json (aggregate stats)
```

### 3. Analytics Queries

```typescript
interface Analytics {
  sessionStats(sessionId: string): SessionMetrics;
  aggregateStats(days: number): AggregateStats;
  toolFrequency(days: number): ToolStats[];
  costTrend(days: number): CostPoint[];
}
```

### 4. Privacy

- Opt-in only (`MEOW_ANALYTICS=true` to enable)
- No external reporting
- Local storage only
- Can export/delete all data

---

## Files to Create

1. `agent-kernel/src/sidecars/analytics.ts` (new)
2. `agent-kernel/src/core/metrics-collector.ts` (new)
3. `agent-kernel/src/core/metrics-store.ts` (new)
4. `agent-kernel/cli/index.ts` (integrate --stats flag)

---

## Acceptance Criteria

- [ ] Per-session token and cost tracking
- [ ] Tool usage frequency
- [ ] Error rate per session
- [ ] Lifetime aggregate stats
- [ ] `meow --stats` command
- [ ] `MEOW_ANALYTICS=false` to disable (default: off)

---

## Related Proposals

- `hooks.md` - Hooks can feed data to analytics
- `memory.md` - Analytics can inform memory prioritization