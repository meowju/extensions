# V3.5: Skill Self-Crystallization Architecture

**Epoch:** 42  
**Priority:** P0 - Blocking (no self-improvement loop)  
**Based on:** GenericAgent (arXiv:2604.17091, ~9K stars)

---

## Problem Statement

**Current State:** Embers executes tasks but doesn't learn from execution patterns. Each similar task starts from scratch.

**Desired State:** Embers crystallizes successful execution paths into reusable Skills (SOPs) that auto-recall on similar tasks.

---

## Core Pattern: Done Hooks → SOP → Memory

```
[Task Execution] → [DoneHook fires] → [Crystallize execution path] → [Write SOP to memory] → [Index for recall]
                    ↓
              [Future similar task] → [Auto-suggest SOP] → [Faster execution]
```

---

## Component Architecture

```
src/
├── core/
│   ├── done-hooks.ts           # Hook registry and execution
│   ├── skill-crystallizer.ts   # Extract patterns from tool calls
│   └── sop-writer.ts           # Write/format Skills to memory
├── sidecars/
│   └── skill-recall.ts         # FTS5 lookup for similar tasks
└── relay.ts                    # Wire DoneHooks into task completion
```

---

## 1. DoneHooks Registry

**File:** `src/core/done-hooks.ts`

```typescript
interface HookContext {
  taskDescription: string;
  toolCalls: ToolCall[];
  duration: number;
  success: boolean;
  error?: string;
}

interface DoneHook {
  name: string;
  trigger: (ctx: HookContext) => boolean;
  execute: (ctx: HookContext) => Promise<void>;
}

class DoneHooksManager {
  hooks: DoneHook[] = [];
  
  register(hook: DoneHook): void;
  unregister(name: string): void;
  async execute(context: HookContext): Promise<void>;
}
```

**Trigger Conditions:**
- `success && toolCalls.length >= 3` → Candidate for crystallization
- `duration > 5000ms` → Long task, high value to crystallize
- `error` && `retryCount > 0` → Failed attempt pattern

---

## 2. Skill Crystallizer

**File:** `src/core/skill-crystallizer.ts`

Extracts reusable execution pattern from tool calls:

```typescript
interface CrystallizedSkill {
  name: string;           // "git_commit_workflow"
  trigger: string;        // "When to apply this skill"
  context: string[];      // Preconditions
  steps: string[];        // Ordered tool calls
  verification: string;   // How to verify success
  confidence: number;     // 0-1 based on past successes
  useCount: number;       // Times recalled
  lastUsed: string;       // ISO timestamp
}

function crystallize(context: HookContext): CrystallizedSkill {
  // 1. Parse task description → skill name
  // 2. Extract tool names → steps
  // 3. Identify preconditions (file existence, git state)
  // 4. Generate verification check
  return skill;
}
```

---

## 3. SOP Writer

**File:** `src/core/sop-writer.ts`

Writes skills in Markdown SOP format to memory:

```markdown
# {skill_name} SOP

## Trigger
- When this skill applies

## Context
- Preconditions needed

## Steps
1. Step one
2. Step two

## Verification
- How to verify success

## Metadata
- confidence: 0.85
- useCount: 12
- lastUsed: 2026-04-27T10:00:00Z
```

---

## 4. Skill Recall (FTS5)

**File:** `src/sidecars/skill-recall.ts`

Full-text search for similar tasks:

```typescript
async function recallSimilarSkills(task: string): Promise<CrystallizedSkill[]> {
  // 1. FTS5 search on task description
  // 2. Rank by relevance + confidence
  // 3. Return top 3 candidates
  // 4. Present to agent for confirmation
}

async function applySkill(skill: CrystallizedSkill): Promise<void> {
  // 1. Check context preconditions
  // 2. Execute steps in order
  // 3. Run verification
  // 4. Increment useCount
}
```

---

## 5. Integration with relay.ts

Wire DoneHooks into task completion flow:

```typescript
// In relay.ts - after task success:
const doneHooksManager = new DoneHooksManager();
doneHooksManager.register({
  name: "skill-crystallizer",
  trigger: (ctx) => ctx.success && ctx.toolCalls.length >= 3,
  execute: async (ctx) => {
    const skill = crystallize(ctx);
    await writeSkillToMemory(skill);
  }
});

// Execute hooks after each task
doneHooksManager.execute({ taskDescription, toolCalls, duration, success });
```

---

## Validation Test Plan

**File:** `dogfood/epoch-42-skill-crystallization.test.ts`

### Test Cases

| ID | Test | Expected |
|----|------|----------|
| T1 | DoneHooks registers and triggers | Hook executes on matching condition |
| T2 | crystallize() extracts tool pattern | Returns valid CrystallizedSkill |
| T3 | SOP writer creates valid markdown | File readable with correct structure |
| T4 | Skill recall finds similar task | Returns ranked results |
| T5 | Full flow: task → crystallize → recall | Skill available for next similar task |

---

## Success Criteria

1. **Auto-crystallization:** After 3+ tool calls, skill created automatically
2. **Recall accuracy:** FTS5 finds skills with >70% similarity
3. **Execution speed:** Skills reduce task time by 50%+
4. **Memory footprint:** Skills stored in SQLite, not context

---

## Implementation Order

1. **XL-30:** DoneHooks registry (foundation)
2. **XL-31:** Skill crystallizer (pattern extraction)
3. **XL-32:** SOP writer (markdown generation)
4. **XL-33:** Skill recall (FTS5 lookup)
5. **XL-34:** Integration with relay.ts
6. **DOGFOOD:** Run epoch-42 tests

---

## References

- GenericAgent: https://github.com/lsdefine/GenericAgent (arXiv:2604.17091)
- Hermes Agent: https://github.com/NousResearch/hermes-agent
- FTS5 SQLite: https://www.sqlite.org/fts5.html
