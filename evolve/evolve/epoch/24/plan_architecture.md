# Epoch 24: Skill Self-Crystallization System - Architecture

**Priority:** P0 - Competitor Gap (NousResearch/hermes-agent has this, Meow doesn't)  
**Epoch:** 24  
**Status:** ARCHITECTING

## 1. Problem Statement

Meow lacks the ability to autonomously learn from successful task completions. When an agent successfully completes a task, it captures the execution path but doesn't convert this into reusable knowledge (SOPs/Skills).

**Current Gap:**
- ❌ No `done_hooks` system after task completion
- ❌ No automatic SOP generation from successful executions
- ❌ No skill tree with FTS5 indexing
- ❌ No self-improvement loop

## 2. Reference Architecture

From `lsdefine/GenericAgent`:
```
Task Success → done_hooks → ToolCall Array Capture → SOP Generator → Skill Tree → FTS5 Index
```

## 3. Proposed Architecture

### 3.1 Core Components

```
src/
  core/
    done-hooks.ts       # Hook infrastructure (NEW)
    skill-crystallizer.ts  # SOP generation (NEW)
  sidecars/
    skill-manager.ts    # EXISTING - extend with retrieval
```

### 3.2 Interface Definitions

```typescript
// src/core/done-hooks.ts

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  duration?: number;
}

export interface HookContext {
  task: {
    id: string;
    description: string;
    success: boolean;
  };
  toolCalls: ToolCall[];
  messages: Message[];
  startTime: number;
  endTime: number;
  metadata?: Record<string, unknown>;
}

export interface DoneHook {
  name: string;
  priority: number;
  trigger: (context: HookContext) => boolean;
  execute: (context: HookContext) => Promise<HookResult>;
}

export interface HookResult {
  success: boolean;
  skillCrystallized?: boolean;
  skillName?: string;
  error?: string;
}
```

### 3.3 DoneHooks Class

```typescript
// src/core/done-hooks.ts

export class DoneHooks {
  private hooks: DoneHook[] = [];
  
  register(hook: DoneHook): void;
  unregister(name: string): boolean;
  async trigger(context: HookContext): Promise<HookResult[]>;
}
```

### 3.4 Skill SOP Format

```typescript
// src/core/skill-crystallizer.ts

export interface SkillSOP {
  name: string;                    // e.g., "proc_mem_scanner"
  version: number;                 // e.g., 1
  createdAt: string;               // ISO timestamp
  trigger: {
    keywords: string[];            // e.g., ["memory", "process", "leak"]
    description: string;           // Natural language description
  };
  context: {
    requirements: string[];        // e.g., ["Linux", "/proc filesystem"]
    prerequisites: string[];       // e.g., ["PID known"]
  };
  steps: {
    order: number;
    action: string;                // e.g., "Read /proc/{pid}/status"
    tool?: string;                 // e.g., "Read"
    parameters?: Record<string, unknown>;
    rationale?: string;
  }[];
  verification: {
    command?: string;              // e.g., "ps aux | grep {pid}"
    expectedPattern?: string;
  };
  usageCount: number;
  successRate: number;
}
```

### 3.5 Crystallization Algorithm

```typescript
async function crystallizeSkill(
  taskDescription: string,
  toolCalls: ToolCall[]
): Promise<SkillSOP> {
  // 1. Extract keywords from task description
  const keywords = extractKeywords(taskDescription);
  
  // 2. Identify required tools from toolCalls
  const requiredTools = [...new Set(toolCalls.map(t => t.name))];
  
  // 3. Group tool calls into ordered steps
  const steps = toolCalls.map((tc, index) => ({
    order: index + 1,
    action: `${tc.name}(${JSON.stringify(tc.arguments)})`,
    tool: tc.name,
    parameters: tc.arguments,
    rationale: inferRationale(tc)
  }));
  
  // 4. Generate verification from last tool call
  const verification = {
    command: inferVerificationCommand(toolCalls),
    expectedPattern: inferExpectedPattern(toolCalls)
  };
  
  return {
    name: generateSkillName(keywords),
    version: 1,
    createdAt: new Date().toISOString(),
    trigger: { keywords, description: taskDescription },
    context: {
      requirements: inferRequirements(toolCalls),
      prerequisites: []
    },
    steps,
    verification,
    usageCount: 0,
    successRate: 1.0
  };
}
```

## 4. Integration Points

### 4.1 Agent Integration (lean-agent.ts)

```typescript
// After task execution completes:
const context: HookContext = {
  task: { id, description, success },
  toolCalls: capturedToolCalls,
  messages: conversationMessages,
  startTime,
  endTime
};

const results = await doneHooks.trigger(context);
```

### 4.2 Skill Manager Integration

```typescript
// In skill-manager.ts, add:
// - saveSkill(skill: SkillSOP): boolean
// - searchSkills(query: string): SkillSOP[]
// - updateSkill(name: string, skill: SkillSOP): boolean
```

### 4.3 Skill Tree Storage

```
.claude/
  skills/
    skill-tree/
      index.sqlite      # FTS5 index
      memory/
        proc_mem_scanner.md
        git_workflow.md
        bug_fix.md
```

## 5. FTS5 Schema

```sql
CREATE VIRTUAL TABLE skill_index USING fts5(
  name,
  trigger_keywords,
  context_requirements,
  steps_text,
  content='skills'
);

CREATE TABLE skills (
  name TEXT PRIMARY KEY,
  version INTEGER,
  created_at TEXT,
  data TEXT  -- JSON of SkillSOP
);
```

## 6. Validation Criteria

### 6.1 Hook Infrastructure (T0)
- [ ] `DoneHooks` class exists in `src/core/done-hooks.ts`
- [ ] `register()`, `unregister()`, `trigger()` methods work
- [ ] Hooks fire in priority order
- [ ] Non-triggering hooks return gracefully

### 6.2 Crystallization Logic (T1)
- [ ] `crystallizeSkill()` generates valid SkillSOP
- [ ] Task description is analyzed for keywords
- [ ] Tool calls are converted to ordered steps
- [ ] Verification section is populated

### 6.3 Skill Storage (T2)
- [ ] Skills saved to `.claude/skills/skill-tree/memory/`
- [ ] FTS5 index is updated on save
- [ ] Skills can be retrieved by keyword search
- [ ] Duplicate skills increment version

### 6.4 Hook Triggers (T3)
- [ ] Hook triggers only on `success: true`
- [ ] Minimum tool calls threshold (≥3) required
- [ ] Hook captures all tool calls in execution
- [ ] Hook handles errors gracefully

### 6.5 Retrieval Integration (T4)
- [ ] `searchSkills(query)` returns relevant skills
- [ ] Results ranked by relevance
- [ ] Empty query returns recent skills
- [ ] Non-existent skills return empty array

## 7. Dependencies

- `src/core/done-hooks.ts` (NEW)
- `src/core/skill-crystallizer.ts` (NEW)
- `src/sidecars/skill-manager.ts` (EXTEND)
- SQLite FTS5 for skill indexing

## 8. Out of Scope (Future Epochs)

- Phase 2: FTS5 Skill Index (can use simple JSON for MVP)
- Phase 3: Skill Improvement Loop
- Phase 4: Self-Bootstrap Planning

## 9. File Locations

| File | Purpose |
|------|---------|
| `src/core/done-hooks.ts` | Hook infrastructure |
| `src/core/skill-crystallizer.ts` | SOP generation |
| `src/sidecars/skill-manager.ts` | Storage/retrieval (extend) |
| `src/core/skill-types.ts` | TypeScript interfaces |

## 10. References

- [GenericAgent](https://github.com/lsdefine/GenericAgent)
- [evolve/backlog/skill-self-crystallization.md](../backlog/skill-self-crystallization.md)
