# DISCOVER: Daily Intelligence Report

**Generated:** 2026-04-27T01:15:00Z  
**Phase:** DISCOVER (Observe outside world + internal metrics → next capability)

---

## 🔍 GitHub Trending Scan (Daily Check)

### Top Trending Repos (2026-04-27)

| # | Repo | Stars | Trend | Meow Gap |
|---|------|-------|-------|----------|
| 1 | obra/superpowers | 166,752 | 📈 | **P1** SDLC workflow, subagents |
| 2 | anomalyco/opencode | 148,983 | 📈 | Not competitor |
| 3 | affaan-m/everything-claude-code | 166,234 | 📈 | Not competitor |
| 4 | NousResearch/hermes-agent | 115,151 | ⭐ | **P0** Self-improvement |
| 5 | bytedance/deer-flow | 63,672 | 📈 | **P1** Multi-agent, skills |
| 6 | ruvnet/ruflo | 33,159 | 📈 | **P1** Multi-agent orchestration |
| 7 | deepseek-ai/DeepGEMM | NEW | 🆕 | Not competitor |
| 8 | openai/openai-agents-python | 24,990 | 📈 | **P0** Sandbox agents |
| 9 | zilliztech/claude-context | 9,000 | 🆕 | **P2** Codebase context |
| 10 | ComposioHQ/composio | 27,903 | 📈 | **P1** Tool orchestration |

### NEW Discovery This Session

**GenericAgent** (lsdefine/GenericAgent) - 9K+ stars, arXiv:2604.17091

Key insight: **Don't preload skills — evolve them.**

- ~3K lines of core code, ~100 line agent loop
- **Done hooks after each task** → captures execution path
- **Skill self-crystallization**: auto-generates skills from task execution
- <30K context window (vs 200K-1M for others)
- Full self-bootstrap proof: everything in repo done by agent

---

## 📊 Internal Metrics (Dogfood Validation)

### Current Status
- **Test Suite:** 459 pass, 72 skip, 0 fail ✅
- **Epochs Validated:** 1, 7, 8, 9, 11, 15, 16 ✅
- **Maturity Score:** 7/10

### Recent Validation Issues (Epoch 22)

| Test | Status | Issue |
|------|--------|-------|
| T3.1 (Session marker) | PARTIAL | Marker text format mismatch |
| T3.2 (Recent msgs) | PASS | Core functionality working |
| T3.3 (System msgs) | PASS | Core functionality working |

**Verdict:** 27/28 pass, core compaction working. T3.1 is test string matching issue.

### P1 Fixes Needed

| ID | Capability | Status | Notes |
|----|------------|--------|-------|
| SESS-001 | Session store initialization | ❌ MISSING | Need initSessionStore() |
| SKILL-002 | Review path extraction | ❌ MISSING | extractReviewPaths() |
| PERM-002 | Dangerous guard check | ❌ MISSING | shell tool guard |

---

## 🎯 Capability Gap Analysis (Priority Ranked)

### P0: BLOCKING (No self-improvement loop)

| # | Gap | Best Competitor | Pattern |
|---|-----|-----------------|---------|
| 1 | **Skill Self-Crystallization** | GenericAgent (9K, arXiv) | done_hooks → SOP → FTS5 |
| 2 | **Context Sandboxing** | context-mode (315KB→5KB) | Tool output → sandbox |
| 3 | **Sandbox Execution** | OpenAI Agents (25K) | Containerized workspace |

### P1: Competitive Gaps (97K+ combined stars)

| # | Gap | Best Competitor | Stars |
|---|-----|-----------------|-------|
| 4 | Multi-Agent Orchestration | deer-flow + ruflo | 97K |
| 5 | Complete SDLC Workflow | superpowers | 167K |
| 6 | Tool Orchestration | Composio | 28K |

### P2: Feature Parity

| # | Gap | Best Competitor | Stars |
|---|-----|-----------------|-------|
| 7 | TDD Workflow | superpowers | 167K |
| 8 | Subagent Dispatch | superpowers | 167K |
| 9 | Codebase Context | claude-context | 9K |

---

## 🏗️ Architecture Decision: Skill Self-Crystallization

### From GenericAgent (arXiv:2604.17091)

```
[New Task] → [Autonomous Exploration] → [Crystallize to SOP] → [Write to Memory] → [Direct Recall]
```

**Done Hooks Pattern:**
```typescript
interface HookContext {
  taskDescription: string;
  success: boolean;
  toolCalls: ToolCall[];
  duration: number;
}

// After each successful task:
const doneHooksManager = new DoneHooksManager();
doneHooksManager.register({
  name: "skill-crystallizer",
  trigger: (ctx) => ctx.success && ctx.toolCalls.length >= 2,
  execute: async (ctx) => {
    const skill = await crystallize(ctx);
    writeSOP(skill);
    indexSkill(db, skill);
  }
});
```

**Skill SOP Format:**
```markdown
# git_commit_workflow SOP

## Trigger
- Committing changes to git
- Saving work with message

## Context
- Git repo initialized
- Changes staged

## Steps
1. git add .
2. git commit -m "{message}"

## Verification
- git log shows new commit
```

---

## 📋 Immediate Action Items

### Today (2026-04-27)
1. ✅ GitHub Trending scan completed
2. ✅ Internal metrics reviewed
3. ✅ P0 gaps identified (Skill Self-Crystallization, Context Sandboxing, Sandbox Execution)
4. ✅ GenericAgent self-crystallization architecture documented

### Next Steps
1. **Implement Skill Self-Crystallization** (P0)
   - Create `src/core/done-hooks.ts`
   - Create `src/core/skill-crystallizer.ts`
   - Create `src/core/sop-writer.ts`
   - Integrate with `lean-agent.ts`

2. **Implement Context Sandboxing** (P0)
   - Create `src/sidecars/tool-sandbox.ts`
   - Integrate with tool-registry
   - Add `--continue` flag

3. **Design Multi-Agent Architecture** (P1)
   - Reference: deer-flow + ruflo supervisor pattern

---

## 📁 Output Files

| File | Purpose |
|------|---------|
| `evolve/backlog/github_trending_inventory.md` | Fresh trending analysis |
| `evolve/backlog/SUMMARY.md` | Priority matrix (updated) |
| `evolve/backlog/genericagent-self-crystallization.md` | NEW - Concrete implementation |

---

## Sources

- https://github.com/trending?since=weekly (2026-04-27)
- https://github.com/lsdefine/GenericAgent (arXiv:2604.17091)
- https://github.com/NousResearch/hermes-agent (115K stars)
- https://github.com/openai/openai-agents-python (25K stars)
- https://github.com/zilliztech/claude-context (9K stars)
- https://github.com/bytedance/deer-flow (63K stars)
- https://github.com/ruvnet/ruflo (33K stars)
- https://github.com/obra/superpowers (167K stars)
- https://github.com/ComposioHQ/composio (28K stars)

---

*DISCOVER phase complete. Ready for DECIDE phase.*