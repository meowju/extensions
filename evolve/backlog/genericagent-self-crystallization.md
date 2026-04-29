# Skill Self-Crystallization - Concrete Implementation

**Priority:** P0 - BLOCKING  
**Created:** 2026-04-27  
**Source:** GenericAgent (arXiv:2604.17091) + GenericAgent repo analysis  
**Stars:** 9K+ | arXiv cited paper

---

## What We Learned from GenericAgent

GenericAgent is a **~3K line self-evolving agent** that:
1. Accomplishes tasks autonomously
2. **Crystallizes execution into skills after success**
3. Directly invokes skills on future similar tasks

The key insight: **Don't preload skills — evolve them.**

> "Everything in this repository, from installing Git and running `git init` to every commit message, was completed autonomously by GenericAgent. The author never opened a terminal once."

### The Self-Crystallization Loop

```
[New Task] --> [Autonomous Exploration] 
    --> [Crystallize Execution Path into skill] 
    --> [Write to Memory Layer] 
    --> [Direct Recall on Next Similar Task]
```

### Skill Tree Growth

| Time | Skills | Token Cost |
|------|--------|------------|
| Start | 0 | <30K context |
| Week 1 | 5-10 | <30K context |
| Month 1 | 30-50 | <30K context |
| Ongoing | Personalized | Never grows |

---

## Concrete Architecture for Meow

### Phase 1: Done Hooks System

```typescript
// src/core/done-hooks.ts

export interface HookContext {
  taskDescription: string;
  success: boolean;
  toolCalls: ToolCall[];  // { tool, args, output }
  duration: number;
  sessionId: string;
}

export interface DoneHook {
  name: string;
  trigger: (ctx: HookContext) => boolean;
  execute: (ctx: HookContext) => Promise<void>;
}

export class DoneHooksManager {
  private hooks: DoneHook[] = [];
  
  register(hook: DoneHook): void {
    this.hooks.push(hook);
  }
  
  async run(ctx: HookContext): Promise<void> {
    for (const hook of this.hooks) {
      if (hook.trigger(ctx)) {
        await hook.execute(ctx);
      }
    }
  }
}
```

### Phase 2: Skill Crystallizer

```typescript
// src/core/skill-crystallizer.ts

interface ExtractedSkill {
  name: string;           // e.g., "git_commit_workflow"
  trigger: string[];      // trigger keywords
  context: string;         // preconditions
  steps: string[];         // execution steps
  verification: string;    // how to verify
  rawToolCalls: ToolCall[]; // full trace for reference
}

export async function crystallize(
  ctx: HookContext
): Promise<ExtractedSkill> {
  // 1. Generate skill name from task
  const name = await generateSkillName(ctx.taskDescription);
  
  // 2. Extract trigger patterns
  const trigger = extractTriggers(ctx.taskDescription);
  
  // 3. Build step sequence from tool calls
  const steps = ctx.toolCalls.map(tc => 
    `${tc.tool}(${formatArgs(tc.args)}) → ${summarizeOutput(tc.output)}`
  );
  
  // 4. Extract context requirements
  const context = extractContext(ctx.toolCalls);
  
  // 5. Generate verification
  const verification = generateVerification(ctx.toolCalls);
  
  return { name, trigger, context, steps, verification, rawToolCalls: ctx.toolCalls };
}
```

### Phase 3: SOP Writer

```typescript
// src/core/sop-writer.ts

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SKILL_TREE_DIR = join(homedir(), ".meow", "skill-tree");

function ensureSkillDir(): void {
  if (!existsSync(SKILL_TREE_DIR)) {
    mkdirSync(SKILL_TREE_DIR, { recursive: true });
  }
}

export function writeSOP(skill: ExtractedSkill): string {
  ensureSkillDir();
  
  const filename = `${skill.name.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.md`;
  const path = join(SKILL_TREE_DIR, filename);
  
  const content = `# ${skill.name} SOP

## Trigger
${skill.trigger.map(t => `- ${t}`).join("\n")}

## Context
${skill.context}

## Steps
${skill.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## Verification
${skill.verification}

---
*Generated: ${new Date().toISOString()}*
*Tool calls: ${skill.rawToolCalls.length}*
`;
  
  writeFileSync(path, content, "utf-8");
  return path;
}
```

### Phase 4: FTS5 Skill Index

```typescript
// src/core/skill-index.ts

import Database from "better-sqlite3";

const SKILL_DB = join(SKILD_DIR, "skills.db");

export function initSkillIndex(): Database {
  const db = new Database(SKILL_DB);
  db.exec(`
    CREATE VIRTUAL TABLE skill_fts USING fts5(
      name,
      trigger,
      context,
      content
    );
  `);
  return db;
}

export function indexSkill(db: Database, skill: ExtractedSkill): void {
  db.prepare(`
    INSERT INTO skill_fts (name, trigger, context, content)
    VALUES (?, ?, ?, ?)
  `).run(
    skill.name,
    skill.trigger.join(" "),
    skill.context,
    skill.steps.join("\n")
  );
}

export function searchSkills(db: Database, query: string): ExtractedSkill[] {
  const rows = db.prepare(`
    SELECT name FROM skill_fts WHERE skill_fts MATCH ?
  `).all(query);
  
  return rows.map(r => loadSkillFromFile(r.name));
}
```

### Phase 5: Integration with LeanAgent

```typescript
// In lean-agent.ts, after successful task completion:

const doneHooksManager = new DoneHooksManager();

// Register default hooks
doneHooksManager.register({
  name: "skill-crystallizer",
  trigger: (ctx) => ctx.success && ctx.toolCalls.length >= 2,
  execute: async (ctx) => {
    const skill = await crystallize(ctx);
    const path = writeSOP(skill);
    indexSkill(db, skill);
    console.log(`✨ Crystallized: ${skill.name}`);
  }
});

doneHooksManager.register({
  name: "memory-learner",
  trigger: (ctx) => ctx.success,
  execute: async (ctx) => {
    autoLearnFromConversation("user", ctx.messages);
  }
});
```

---

## File Structure

```
~/.meow/
  skill-tree/
    skills.db              # FTS5 index
    memory/
      git_commit_workflow_1712345678.md
      bug_fix_pattern_1712345679.md
    index.json             # Quick lookup
```

---

## Integration Points

| Component | Change Required |
|-----------|-----------------|
| `lean-agent.ts` | Add DoneHooksManager, run after task completion |
| `tool-registry.ts` | Capture tool calls in execution trace |
| `memory.ts` | Link with skill tree |
| `cli/index.ts` | Add `/skills` command, `hermes skills` equivalent |

---

## Verification

### Test 1: Simple Task Crystallization
```bash
# Run a task
meow "Create a README for my project"

# Verify skill was created
ls ~/.meow/skill-tree/memory/
# Should contain readme_creation_*.md
```

### Test 2: Skill Retrieval
```bash
# Similar task later
meow "Write a README with installation steps"

# Should invoke the skill instead of exploring from scratch
```

### Test 3: Self-Improvement
```bash
# Run same task twice with different approach
# Second run should update the SOP
```

---

## References
- https://github.com/lsdefine/GenericAgent (arXiv:2604.17091)
- https://github.com/lsdefine/GenericAgent/blob/main/src/agent_loop.py
- https://arxiv.org/abs/2604.17091