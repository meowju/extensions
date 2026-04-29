# Skill Self-Crystallization Architecture

**Priority:** P0 - BLOCKING (Competitor gap: GenericAgent has this, Meow doesn't)  
**Created:** 2026-04-25  
**Status:** DISCOVERED

## What GenericAgent Does

From `lsdefine/GenericAgent` analysis:

### Self-Crystallization Pattern
1. Agent executes task successfully
2. `done_hooks` system detects success
3. Execution path is captured as tool_call array with parameters
4. Skill is written as markdown SOP to `memory/` directory
5. Skill includes: Trigger, Context, Steps, Verification
6. Future similar tasks retrieve from skill tree via FTS5

### SOP Format Example (from GenericAgent)
```markdown
# proc_mem_scanner SOP

## Trigger
- Process memory scanning on Linux systems
- Detecting memory leaks

## Context
- Running on Linux with /proc filesystem
- Need to identify process by PID

## Steps
1. Read /proc/{pid}/status for memory info
2. Parse VmSize, VmRSS fields
3. Compare against baseline measurements

## Verification
- Verify with ps aux | grep {pid}
```

## Why This Matters

GenericAgent built its entire repository autonomously using this system. The agent:
1. Identified it needed a memory scanner
2. Created the SOP from its own successful execution
3. Retrieved and improved the skill on subsequent tasks

This is **self-bootstrapping** - the agent improves itself through use.

## Meow Gap Analysis

Current Meow state:
- ❌ No skill crystallization after task completion
- ❌ No done_hooks system
- ⚠️ Basic skill installation exists (`skill-manager.ts`)
- ❌ No SOP format or skill tree
- ❌ No FTS5 skill retrieval

## Architecture Proposal

### 1. Done Hooks System
```typescript
// agent-kernel/src/core/done-hooks.ts

interface DoneHook {
  name: string;
  trigger: (context: HookContext) => boolean;
  execute: (context: HookContext) => Promise<void>;
}

interface HookContext {
  task: Task;
  success: boolean;
  toolCalls: ToolCall[];
  result: string;
  messages: Message[];
}
```

### 2. Crystallization Hook
```typescript
// After successful task completion:
const crystallizationHook: DoneHook = {
  name: "skill-crystallizer",
  trigger: (ctx) => ctx.success && ctx.toolCalls.length >= 3,
  execute: async (ctx) => {
    const skill = await crystallizeSkill(ctx.task, ctx.toolCalls);
    await saveSkillToTree(skill);
  }
};
```

### 3. Skill SOP Generator
```typescript
async function crystallizeSkill(task: Task, toolCalls: ToolCall[]): Promise<SkillSOP> {
  // Analyze tool calls to extract:
  // - What triggered the task
  // - What steps were taken
  // - What context was needed
  
  // Generate markdown SOP
  return {
    name: generateSkillName(task),
    trigger: extractTrigger(task),
    context: extractContext(toolCalls),
    steps: extractSteps(toolCalls),
    verification: extractVerification(toolCalls)
  };
}
```

### 4. Skill Tree Structure
```
.claude/
  skills/
    skill-tree/
      index.json          # FTS5 index of all skills
      memory/
        proc_mem_scanner_sop.md
        git_workflow_sop.md
        bug_fix_sop.md
```

### 5. Retrieval Integration
```typescript
// In skill-manager.ts, add:
export function searchSkills(query: string): Skill[] {
  // Use FTS5 to search skill tree
  // Return ranked results
}

export function getRelevantSkills(task: string): Skill[] {
  // Find skills triggered by similar patterns
}
```

## Implementation Phases

### Phase 1: Hook Infrastructure (P0)
- Add `DoneHooks` class to lean-agent.ts
- Create `crystallizeSkill()` function
- Write SOPs to `.claude/skills/skill-tree/memory/`

### Phase 2: FTS5 Skill Index (P1)
- Add SQLite skill index
- Index by trigger keywords, context, steps
- Enable natural language retrieval

### Phase 3: Skill Improvement Loop (P2)
- Compare new execution to existing SOP
- Update SOP if better path found
- Track skill usage metrics

### Phase 4: Self-Bootstrap (P3)
- Agent uses skill tree for task planning
- Agent improves own skills over time
- Community skill sharing format

## Copy-Worthy from GenericAgent

1. **Done hooks after each task** - not just on failure
2. **Tool call array capture** - full execution trace
3. **SOP format with 4 sections** - Trigger, Context, Steps, Verification
4. **FTS5 index for retrieval** - fast skill lookup
5. **Token-efficient storage** - layered memory

## Sources
- https://github.com/lsdefine/GenericAgent
- https://github.com/lsdefine/GenericAgent/blob/main/src/agent_loop.py
