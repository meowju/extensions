# Epoch 24 Promise: Local-First Orchestration

**Created**: 2026-04-26  
**Status**: IN_PROGRESS  
**Owner**: Embers (Orchestrator)

## Promised Capabilities

### 1. XL-20: Local-First Orchestration
- **Goal**: Patch `.github/scripts/orchestrator.ts` (copied to `/app/jobs/bun-orchestrator.ts`) to prioritize local `JOB.md` over remote git fetches
- **Success Criteria**: 
  - Orchestrator reads local files without git dependency
  - `checkEpochGates()` finds local promise files
  - Planning cycle triggers on local file changes

### 2. XL-18: Metacognition Audit (Reasoning Audit)
- **Goal**: Implement `reasoning_audit` table in `memory.ts` 
- **Success Criteria**:
  - Full traces of swarm successes/failures captured
  - `search_memory` finds "Lessons Learned" from previous tasks
  - DoneHooks in `relay.ts` wire up reasoning capture

### 3. XL-15: MeowGateway (Platform Sovereignty)
- **Goal**: Standalone WebSocket server to replace Discord-coupled relay
- **Success Criteria**:
  - Sub-process gateway sends pings to local dashboard
  - Independent of Discord relay

## Architecture Decisions

1. **Local-First Overrides**: Config flag `ORCHESTRATOR_LOCAL_ONLY=true`
2. **Memory Consolidation**: After each job, call `consolidateJobMemories()`
3. **Epoch Gate**: DOGFOOD validates before EVOLVE proceeds

## Validation Tests
See `/app/dogfood/epoch-24-validation.test.ts`

## Dependencies
- Epoch 23: Session compaction (✅ VALIDATED)
- Epoch 22: Cross-agent patterns (✅ VALIDATED)

## Blockers
- None

---

*This promise MUST be validated by DOGFOOD before Epoch 25 can begin.*
