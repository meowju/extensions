# Capability Backlog Summary

**Generated:** 2026-04-27T00:58:00Z  
**Based on:** GitHub Trending (2026-04-27) + GenericAgent arXiv + Hermes + OpenAI Agents + Dogfood Validation

---

## P0 Priority: NEW - Skill Self-Crystallization Architecture Ready

From GenericAgent (arXiv:2604.17091, ~9K stars):

### Done Hooks System Pattern
```python
# Done hooks execute after each successful task
done_hooks = [skill_crystallizer, memory_update, metrics_track]
for hook in done_hooks:
    hook.execute(context)
```

### Self-Crystallization Loop
```
[New Task] → [Autonomous Exploration] → [Crystallize Execution Path] → [Write to Memory Layer] → [Direct Recall on Next Similar Task]
```

### Skill SOP Format
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
```

---

## Priority Matrix (UPDATED 2026-04-27)

| Rank | Capability | Priority | Source | Status |
|------|------------|----------|--------|--------|
| 0 | Skill Self-Crystallization | **P0** | Hermes Agent (115K) | DISCOVERED - ready to implement |
| 0 | Context Sandboxing | **P0** | context-mode | DISCOVERED - ready to implement |
| 0 | Sandbox Execution | **P0** | OpenAI Agents SDK (25K) | **NEW** - proposal created |
| 1 | Multi-Agent Orchestration | **P1** | deer-flow + ruflo | 97K stars combined, architecture proposed |
| 1 | Complete SDLC Workflow | **P1** | superpowers | 167K stars, methodology documented |
| 1 | Tool Orchestration | **P1** | Composio | 28K stars, pattern identified |
| 2 | Subagent Dispatch | **P2** | superpowers | Two-stage review pattern |
| 2 | TDD Workflow | **P2** | superpowers | RED-GREEN-REFACTOR enforcement |
| 2 | Codebase Context | **P2** | claude-context | 9K stars, semantic code search |
| 2 | User Modeling | **P2** | Hermes Agent | FTS5 session search + Honcho |

---

## NEW DISCOVERIES (2026-04-27)

### Hermes Agent - 115K Stars ⭐
**Self-Improving AI Agent with Closed Learning Loop:**
- Creates skills from experience autonomously
- Skills self-improve during use
- FTS5 session search with LLM summarization
- Cross-session recall and user modeling (Honcho)
- Scheduled automations (cron jobs in natural language)
- Subagents for parallel workstreams

### OpenAI Agents SDK - 25K Stars ⭐
**Multi-Agent Workflows Framework:**
- Sandbox Agents with manifest-based initialization
- Guardrails for input/output validation
- Human-in-the-loop mechanisms
- Sessions with automatic conversation history
- Realtime Agents for voice

### claude-context - 9K Stars
**Code Search MCP for Claude Code:**
- Semantic code search
- Cross-reference navigation
- Context-aware suggestions

---

## Multi-Agent Architecture (P1)

From deer-flow (63K) + ruflo (33K) combined research:

### Supervisor Pattern
- Main agent delegates to specialized workers
- Workers: Coder, Tester, Reviewer, Researcher, Architect, Security
- Shared context store (not message passing)
- Interruptible execution

### Swarm Topologies
- mesh: All agents communicate
- hier: Supervisor → workers
- ring: Sequential handoffs
- star: Central coordinator

### Key Insight
> "Agents read/write to shared context, not direct messaging. This allows the supervisor to maintain state while agents work in parallel."

---

## Blocking Issues (Must Fix First)

| Epoch | Capability | Status | Fix Required |
|-------|------------|--------|--------------|
| P0 | Skill Self-Crystallization | DISCOVERED | done_hooks, SOP generation, FTS5 tree |
| P0 | Context Sandboxing | DISCOVERED | Tool output → 5KB, --continue |

---

## Competitor Analysis (Updated)

### deer-flow (Bytedance) - 63K Stars
**Super Agent Harness** with:
- Hierarchical sub-agents (research, coding, review, memory)
- Skill chaining: research → code → review
- Sandbox execution for safety
- One-line agent setup prompt
- LangSmith/Langfuse tracing

### ruflo v3.5 - 33K Stars
**Enterprise Multi-Agent Orchestration**:
- 16 specialized agent roles
- Q-Learning router
- 130+ skills, 27 hooks
- WASM kernels in Rust
- Fault-tolerant consensus

### goose - 43K Stars (Linux Foundation)
**Native AI Agent**:
- Rust-based for performance
- 15+ LLM providers
- 70+ MCP extensions
- CLI + desktop app

### superpowers - 167K Stars
**Complete SDLC Methodology**:
- brainstorm → design → plan → execute → review → finish
- Subagent-driven with two-stage review
- RED-GREEN-REFACTOR enforced

---

## Capability Gap Matrix

| Capability | superpowers | deer-flow | ruflo | goose | context-mode | GenericAgent | **Meow** | Gap |
|------------|-------------|-----------|-------|-------|--------------|--------------|----------|-----|
| Complete SDLC | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | **P1** |
| Multi-Agent | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **P1** |
| Skill Self-Crystal | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | **P0** |
| Context Sandbox | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | **P0** |
| Subagent Dispatch | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **P2** |
| Shared Context | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **P2** |
| TDD Workflow | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **P2** |
| Tool Orchestration | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ⚠️ | **P1** |
| 100+ Skills | ✅ | ✅ | ✅ 130+ | ⚠️ | ❌ | ⚠️ | ❌ | **P3** |
| Multi-Provider | ✅ 6+ | ⚠️ | ✅ | ✅ 15+ | ❌ | ❌ | ❌ | **P3** |

---

## Backlog Proposals

| # | Proposal | Priority | Status | Source |
|---|----------|----------|--------|--------|
| 1 | `skill-self-crystallization.md` | P0 | DISCOVERED | GenericAgent |
| 2 | `context-mode-98-percent-reduction.md` | P0 | DISCOVERED | context-mode |
| 3 | `multi-agent-coordination.md` | P1 | NEW - proposed | deer-flow + ruflo |
| 4 | `skill-workflow-methodology.md` | P1 | DISCOVERED | superpowers |
| 5 | `context-sandboxing.md` | P0 | CANDIDATE | context-mode |
| 6 | `streaming-ux.md` | P1 | Proposed | Dogfood EPOCH 17 |
| 7 | `memory.md` | P1 | Proposed | Hermes |
| 8 | `hooks.md` | P2 | Proposed | TODO.md |
| 9 | `tui.md` | P2 | Proposed | Hermes |
| 10 | `repl.md` | P2 | Proposed | TODO.md |
| 11 | `analytics.md` | P4 | Proposed | TODO.md |

---

## Immediate Action Items

### P0: Skill Self-Crystallization
```
Architecture: done_hooks → tool_call capture → SOP generation → FTS5 skill tree
Reference: GenericAgent/src/agent_loop.py
Priority: BLOCKING - no self-improvement loop
```

### P0: Context Sandboxing
```
Architecture: Tool output → summarize → 5KB ref → FTS5 index → --continue restore
Reference: mksglu/context-mode (315KB→5.4KB reduction)
Priority: BLOCKING - context overflow
```

### P1: Multi-Agent Coordination
```
Architecture: Supervisor → Worker roles → Shared context → Claims
Reference: deer-flow + ruflo combined
Priority: Competitive gap (97K stars)
```

### P1: Skill Workflow Methodology
```
Architecture: brainstorm → design → plan → execute → review → finish
Reference: superpowers (167K stars)
Priority: Competitive gap
```

---

## Files Created/Updated This Session

| File | Purpose | Status |
|------|---------|--------|
| `github_trending_inventory.md` | Fresh trending analysis | UPDATED |
| `multi-agent-coordination.md` | NEW - deer-flow + ruflo patterns | CREATED |
| `SUMMARY.md` | Priority matrix | UPDATED |

---

## Next Steps

1. **Implement Skill Self-Crystallization** (P0) - Architecture ready
2. **Implement Context Sandboxing** (P0) - Architecture ready
3. **Design Multi-Agent Supervisor** (P1) - Proposal created
4. **Extend Skill Workflow** (P1) - Superpowers methodology documented

---

## Sources This Session
- https://github.com/trending?since=weekly (2026-04-27)
- https://github.com/NousResearch/hermes-agent (115,151 stars) - Skill self-crystallization, user modeling
- https://github.com/openai/openai-agents-python (24,990 stars) - Sandbox agents, multi-agent SDK
- https://github.com/zilliztech/claude-context (9,000 stars) - Codebase context
- https://github.com/bytedance/deer-flow (63,672 stars)
- https://github.com/ruvnet/ruflo (33,159 stars)
- https://github.com/aaif-goose/goose (43,172 stars)
- https://github.com/obra/superpowers (166,752 stars)
- https://github.com/lsdefine/GenericAgent
- https://github.com/mksglu/context-mode