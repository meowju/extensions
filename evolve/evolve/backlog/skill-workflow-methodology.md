# Skill Workflow Methodology

**Priority:** P1 - Competitive (Competitor gap: Superpowers has complete SDLC workflow, Meow lacks methodology)  
**Created:** 2026-04-26  
**Status:** DISCOVERED

## What Superpowers Does

From `obra/superpowers` analysis (166K stars):

### Complete SDLC Workflow
```
brainstorming → design approved → writing-plans → executing-plans → reviewing → finishing
```

### 1. Brainstorming (Before Writing Code)
- Activates before any code writing
- Asks "What are you really trying to do?"
- Socratic refinement through questions
- Presents design in chunks for validation
- Saves design document

### 2. Writing Plans
- Breaks work into 2-5 minute tasks
- Every task has: exact file paths, complete code, verification steps
- Clear enough for "enthusiastic junior engineer with poor taste, no judgement"
- Plans get reviewed and approved before execution

### 3. Executing Plans (Subagent-Driven)
- Dispatches fresh subagent per task
- Two-stage review:
  1. Spec compliance check
  2. Code quality check
- Batch execution with human checkpoints

### 4. Code Review
- Reviews against plan
- Reports issues by severity
- Critical issues block progress

### 5. Finishing Branch
- Verifies tests
- Offers: merge / PR / keep / discard options
- Cleans up worktree

### 6. TDD Enforcement (RED-GREEN-REFACTOR)
- Write failing test first
- Watch it fail
- Write minimal code
- Watch it pass
- Delete code written before tests

## Why This Matters for Meow

Meow has:
- ⚠️ Basic skills system (load/dispatch)
- ❌ No workflow methodology
- ❌ No subagent dispatch
- ❌ No plan-based execution
- ❌ No TDD enforcement

Superpowers is 166K stars because it makes agents actually productive for real software development, not just "do a task."

## Meow Gap Analysis

Current Meow state:
- ❌ No brainstorming phase
- ❌ No plan writing with tasks
- ❌ No subagent dispatch
- ❌ No two-stage review
- ❌ No branch finishing workflow
- ⚠️ Basic skill loading exists

## Architecture Proposal

### Phase 1: Brainstorming Skill (P1)
```typescript
// agent-kernel/src/skills/brainstorming.ts

interface BrainstormSkill {
  systemPromptContribution: string;  // Triggers before code writing
  activatedBy: string[];  // ["start_project", "new_feature", "refactor"]
  
  execute: async (context: TaskContext) => {
    // 1. Ask clarifying questions
    // 2. Socratic refinement
    // 3. Present design in chunks
    // 4. Save design doc
    // 5. Await approval before proceeding
  }
}
```

### Phase 2: Plan Writer Skill (P1)
```typescript
// agent-kernel/src/skills/writing-plans.ts

interface PlanSkill {
  execute: async (designDoc: DesignDoc) => {
    // Break into 2-5 min tasks
    // Each task has:
    // - Exact file paths
    // - Complete code
    // - Verification steps
    // Return: Task[]
  }
}
```

### Phase 3: Subagent Dispatch (P2)
```typescript
// agent-kernel/src/core/subagent-dispatch.ts

interface SubagentDispatch {
  dispatchTask(task: Task): Promise<TaskResult>;
  
  twoStageReview: {
    stage1: "spec_compliance";  // Does it do what the plan says?
    stage2: "code_quality";    // Is the code good?
  };
}
```

### Phase 4: Branch Finishing (P2)
```typescript
// agent-kernel/src/skills/finishing-branch.ts

interface FinishingSkill {
  verifyTests(): Promise<boolean>;
  offerOptions(): "merge" | "pr" | "keep" | "discard";
  cleanup(): void;
}
```

## Implementation Priority

| Phase | Feature | Priority | Notes |
|-------|---------|----------|-------|
| 1 | Brainstorming skill | P1 | Ask clarifying questions before code |
| 2 | Plan writing skill | P1 | Break into 2-5 min tasks |
| 3 | Subagent dispatch | P2 | Two-stage review |
| 4 | Branch finishing | P2 | Verify + offer options |
| 5 | TDD enforcement | P2 | RED-GREEN-REFACTOR hooks |

## Copy-Worthy from Superpowers

1. **"The agent checks for relevant skills before any task"** - mandatory workflow
2. **"Plan is clear enough for enthusiastic junior engineer"** - specificity standard
3. **"Two-stage review: spec compliance, then code quality"** - review methodology
4. **"RED-GREEN-REFACTOR"** - TDD enforced at skill level
5. **Design in chunks for validation** - progressive approval

## Integration with Existing Skills

Meow already has:
- `agent-kernel/src/skills/auto.ts` - skill auto-loading
- `agent-kernel/src/skills/hooks.ts` - skill hooks
- `agent-kernel/src/skills/learn.ts` - learning system

Need to extend:
- Add workflow triggers (brainstorming before code, etc.)
- Add plan storage and retrieval
- Add subagent context isolation

## Sources
- https://github.com/obra/superpowers (166,752 stars)
- https://blog.fsck.com/2025/10/09/superpowers/ (release announcement)