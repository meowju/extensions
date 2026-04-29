# Architecture Plan: Reasoning Audit Integration (XL-18)

## Problem Statement
The `reasoning_audit.db` exists but is not wired into the DoneHooks system. Metacognition requires automatic capture of agent reasoning traces after each task.

## Target State
- `reasoning_audit` table automatically populated after each task completes
- DoneHooks triggers `logReasoningTrace()` on successful task completion
- Full OODA loop traces captured for lessons-learned queries

## Implementation Plan

### 1. Create ReasoningAudit Module (`src/core/reasoning-audit.ts`)

```typescript
interface ReasoningTrace {
  id: string;
  sessionId: string;
  taskId: string;
  taskDescription: string;
  phase: 'observe' | 'orient' | 'decide' | 'act' | 'reflect';
  reasoning: string;
  toolCalls: ToolCall[];
  outcome: 'success' | 'failure' | 'partial';
  durationMs: number;
  timestamp: number;
  lessonsLearned?: string;
  tags: string[];
}

class ReasoningAudit {
  private db: Database;
  
  async logTrace(trace: ReasoningTrace): Promise<void>;
  async getTraces(taskId: string): Promise<ReasoningTrace[]>;
  async getLessonsLearned(taskId: string): Promise<string[]>;
}
```

### 2. Wire Into DoneHooks (relay.ts)

```typescript
import { ReasoningAudit } from './reasoning-audit';

const audit = new ReasoningAudit(dataDir);

// Register audit hook
const auditHook: DoneHook = {
  name: 'reasoning-audit-hook',
  priority: 90,
  trigger: (ctx) => ctx.task.success === true,
  execute: async (ctx) => {
    await audit.logTrace({
      id: `audit_${Date.now()}_${randomId()}`,
      sessionId: ctx.metadata?.sessionId || 'unknown',
      taskId: ctx.task.id,
      taskDescription: ctx.task.description,
      phase: 'reflect',
      reasoning: extractReasoning(ctx.messages),
      toolCalls: ctx.toolCalls,
      outcome: ctx.task.success ? 'success' : 'failure',
      durationMs: ctx.endTime - ctx.startTime,
      timestamp: Date.now(),
      lessonsLearned: extractLessons(ctx.messages),
      tags: extractTags(ctx.messages)
    });
    return { success: true };
  }
};

doneHooks.register(auditHook);
```

### 3. Validation Test

- Create `evolve/epoch/32/validation.test.ts`
- Test: `DoneHooks.trigger()` → verifies `reasoning_audit` table populated
- Test: `search_memory("lessons learned")` → returns audit entries

## Files to Modify
1. **NEW**: `src/core/reasoning-audit.ts` - ReasoningAudit class
2. **MODIFY**: `relay.ts` - Wire ReasoningAudit into DoneHooks
3. **NEW**: `evolve/epoch/32/validation.test.ts` - Validation tests

## Success Criteria
- [ ] `reasoning_audit` table populated after successful task
- [ ] `search_memory("lessons")` returns extracted lessons
- [ ] Unit tests pass
