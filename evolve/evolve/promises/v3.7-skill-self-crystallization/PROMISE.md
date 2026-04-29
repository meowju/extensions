# V3.7 PROMISE: Skill Self-Crystallization

**Epoch:** 44  
**Capability:** Done Hooks → Auto-generate Skills from Task Execution  
**Pattern Source:** lsdefine/GenericAgent (arXiv:2604.17091)

---

## 📜 Capability Promise

After completing any task, the agent will **automatically crystallize the execution pattern into a reusable Skill SOP** stored in SQLite FTS5 and indexed for direct recall on future similar tasks.

---

## 🎯 Core Components

### 1. DoneHooks System (`src/core/done-hooks.ts`)
- Register hooks that trigger after task completion
- Capture: task description, tool calls, success/failure, duration
- Execute crystallization logic asynchronously

### 2. Skill Crystallizer (`src/core/skill-crystallizer.ts`)
- Analyze tool call sequences from DoneHook context
- Generate SOP with: Trigger, Context, Steps, Verification
- Detect repeated patterns (2+ similar executions → skill candidate)

### 3. SOP Writer (`src/core/sop-writer.ts`)
- Write skills to `~/.meow/skills/` directory
- Index skills in SQLite FTS5 for full-text search
- Maintain skill metadata (usage count, success rate, last used)

### 4. Skill Recall (`src/core/skill-recall.ts`)
- On new task, check FTS5 for similar skills
- If match found, suggest skill SOP before execution
- Track skill effectiveness over time

---

## 🔧 Integration Points

| File | Change |
|------|--------|
| `lean-agent.ts` | Add DoneHooksManager, call after each task |
| `relay.ts` | Wire up hook execution on success |
| `skill-recall.ts` | Query FTS5 before tool execution |
| `tool-registry.ts` | Add skill hook registry |

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Skills crystallized per session | ≥1 for repeated patterns |
| Skill recall accuracy | ≥80% for similar tasks |
| Context reduction | <30K for crystallized workflows |
| False positive rate | <10% |

---

## 🔗 Dependencies

- P1: SESS-001 (Session store init) - for skill metadata
- P1: PERM-002 (Dangerous guard) - for hook safety
