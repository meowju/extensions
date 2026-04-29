=== Research: Iteration 6 - Cross-Tool Synthesis & Actionable Roadmap ===

Date: 2026-04-24

## Executive Summary

This iteration documents the cross-agent streaming bug pattern (NOT Meow-specific) and synthesizes competitive research across Cursor, Claude Code, Windsurf, Vox, Builder.io, and GitHub Copilot Workspace into an actionable roadmap for Meow.

## Part 1: Cross-Agent Streaming Bug Pattern

### The Bug is NOT Meow-Specific

From Cursor changelog (Apr 15, 2026):
> "Fixed a bug where an agent conversation full of diffs or code blocks would flash and freeze"

This bug has affected:
- **Cursor**: Agent conversations with diffs/code blocks flash and freeze
- **Claude Code**: Long conversations hang on follow-up; large edits stream poorly
- **Meow**: Same issue - likely from lack of buffering in relay flow

### Root Cause Chain

```
Streaming LLM Output (tokens arrive rapidly)
        ↓
Per-token terminal/DOM writes (no buffering)
        ↓
Special characters: ```, ```, ``` (code fences)
        ↓
Terminal receives: backtick, backtick, backtick, n, e, w...
        ↓
Code fence detected MID-TOKEN → cursor confusion
        ↓
Flash/freeze: overlapping cursor positions, dropped frames
```

### Fixes Applied by Other Systems

| System | Fix Applied |
|--------|-------------|
| **Cursor** | Limited diff fetches, lazy updates, 87% frame reduction |
| **Claude Code** | Token buffering, graceful abort, session compaction |

### Cursor's Specific Fixes (Apr 2026)

1. **Limited Local Diff Fetches** - Reduced CPU/network spikes by batching
2. **Lazy Update Pattern** - "Avoids expensive updates unless truly needed"
3. **Frame Drop Monitoring** - Track and dynamically adjust buffer
4. **Code Block Aware Flushing** - Flush at ``` boundaries

### Workarounds Found

1. **Code fence aware chunking** - Keep code blocks intact, don't split at fences
2. **Increase flush interval** - If rendering slow, increase buffer flush interval
3. **Rate limiting** - Add delay between chunk sends

## Part 2: Competitive Analysis Synthesis

### Architecture Comparison

| System | Architecture | Strengths | Weaknesses |
|--------|-------------|-----------|------------|
| **Cursor** | Desktop IDE + Agents Window | Rich UI, visual debugging | Desktop-only, complex |
| **Claude Code** | CLI streaming | Clean, fast, permission system | Terminal-only |
| **Windsurf** | Cascade (hierarchical agents) | Multi-agent coordination | Complex, over-engineered |
| **Vox** | UI patterns library | Human-agent collaboration | Conceptual, not tool |
| **Builder.io** | Visual + AI | Component generation | Visual context assumed |
| **Copilot Workspace** | Autonomous task execution | Full autonomy | GitHub-locked, slow |

### Key Patterns to Adopt

#### 1. Grace Iteration on Limit (Claude Code)
When max iterations reached, give agent one final turn to summarize:
```typescript
if (iteration >= maxIterations && !isComplete) {
  // Add grace iteration
  await agent.finalTurn("Summarize progress and finalize state");
}
```

#### 2. Code Block Aware Flushing (Cursor Pattern)
Detect ``` fence boundaries and flush buffer:
```typescript
if (token.includes("```")) {
  buffer.flush();  // Flush before code block
  onFlush(token);
  buffer.flush();  // Flush after code block
}
```

#### 3. Learned Auto-Approve (Claude Code)
Track user approval patterns, auto-approve after 3+:
```typescript
const approvalCount = approvals.get(operationType);
if (approvalCount >= 3) {
  return autoApprove();
}
```

#### 4. Rich Agent States (Vox)
Show specific states, not just "thinking":
- "Indexing codebase..."
- "Executing command..."
- "Waiting for permission..."

#### 5. Task Planning (Copilot Workspace)
Show plan before multi-step execution:
```
Plan:
1. Create utils/format.ts
2. Add formatDate() function
3. Update exports

Continue? [y/N]
```

#### 6. Change Summary (Copilot Workspace)
After completion, summarize changes:
```
Changes:
- Created utils/format.ts
- Added formatDate() helper
- Updated 2 files

Ready to commit? [y/N]
```

### Patterns to Avoid

| Anti-pattern | Why Avoid | Meow Alternative |
|--------------|-----------|-----------------|
| Per-token terminal writes | Causes flash/freeze | Use buffering layer |
| Raw streaming to Discord | Same issue | Buffer before send |
| Mid-stream crashes | Lose partial work | Catch, return partial |
| Global session state | Causes conflicts | Scope to session |
| Implicit auto-run | Security risk | Explicit confirmation |
| Desktop-only design | Limits reach | Terminal-first |

## Part 3: Meow-Specific Action Plan

### Immediate Fixes (P0)

#### 1. Apply TokenBuffer to relay flow
**File**: `agent-harness/src/relay.ts`
**Problem**: TokenBuffer exists but NOT used by main relay
**Fix**: Wrap message sending with buffering layer

#### 2. Add code fence detection to streaming.ts
**File**: `agent-kernel/src/sidecars/streaming.ts`
**Problem**: Code fences cause mid-token confusion
**Fix**: Flush buffer at ``` boundaries

#### 3. Make chunkMessage code fence aware
**File**: `agent-harness/src/relay.ts`
**Problem**: chunkMessage() splits code blocks incorrectly
**Fix**: Keep code blocks intact when chunking

### Short-term Improvements (P1)

#### 4. Grace iteration on limit
**File**: `agent-kernel/src/core/lean-agent.ts`
**Fix**: Add final turn when max iterations reached

#### 5. Abort error handling
**File**: `agent-kernel/src/core/lean-agent.ts`
**Fix**: Catch 'Request was aborted' specifically

#### 6. Rich agent states
**File**: `agent-harness/src/relay.ts`
**Fix**: Show specific states ("Indexing...", not just "Thinking...")

### Medium-term Features (P2)

#### 7. Learned auto-approve
Track approval patterns, auto-approve after 3+
**File**: `agent-harness/src/permissions.ts` (new)

#### 8. Task planning
Show plan before multi-step execution
**File**: `agent-harness/src/planning.ts` (new)

#### 9. Change summary
Summarize changes after completion
**File**: `agent-harness/src/relay.ts`

#### 10. Session compaction
When context exceeds limit, summarize with LLM
**File**: `agent-kernel/src/core/session.ts`

## Part 4: Implementation Status

### TokenBuffer Class (Exists)
Location: `agent-kernel/src/sidecars/streaming.ts`
- Flushes every 20 chars OR 50ms
- Used by `runAgentStream()`
- NOT used by main relay flow

### Main Relay Flow (Needs Fix)
Location: `agent-harness/src/relay.ts`
- Uses non-streaming `runLeanAgent`
- Chunks response, sends via `message.reply()`
- Does NOT use buffering

### Key Gap
The `TokenBuffer` class exists but is NOT applied to the main relay flow. This is the likely source of Meow's flash/freeze bug.

## Sources ==

1. https://cursor.com/changelog (Apr 15, 14, 8, 2026)
2. https://docs.anthropic.com/en/docs/claude-code
3. codeium.com/windsurf (Cascade architecture)
4. GitHub Copilot Workspace documentation
5. https://www.builder.io/blog/ai-components
6. agent-kernel/src/sidecars/streaming.ts (TokenBuffer)
7. agent-harness/src/relay.ts (main relay)
8. iteration-5-streaming-bug-2026-04-24.md
9. iteration-5-root-cause-fix-2026-04-24.md
