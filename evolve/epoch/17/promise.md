=== EPOCH PROMISE ===

## Capability to Implement
Rich Agent State Indicators

## What It Does
Shows specific, actionable agent states (e.g., "Indexing codebase...", "Executing command...", "Waiting for permission...") instead of generic "Thinking..." indicators. Enables users to understand what the agent is doing at each moment.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: State indicator function exists** - `setAgentState()` or similar function that updates the current state
2. **Test: Multiple states defined** - At least 5 distinct states (Thinking, Indexing, Executing, Waiting, Summarizing, Complete, Error)
3. **Test: States shown during tool execution** - Verify states change during read/write/shell operations
4. **Test: State is visible in relay flow** - The main relay.ts flow uses state indicators
5. **Must be reproducible** - Run agent and observe state changes during execution

## From Research: Vox + Claude Code (Primary Sources)

### Vox's Rich Agent States Pattern
Vox shows specific states, not just "thinking":
- "Indexing codebase..."
- "Executing command..."
- "Waiting for permission..."
- "Summarizing context..."

### Claude Code's Approach
Claude Code shows progress indicators:
- Thinking indicator during tool planning
- "Reading files..." during file operations
- "Running command..." during shell execution

### Meow's Current State (Gap Analysis)
| Component | Current State | Needed |
|----------|--------------|--------|
| lean-agent.ts | Generic iteration counter | Specific state per tool |
| relay.ts | Just "thinking..." placeholder | Rich state updates |
| meow-agent.ts | Silent until response | Progress indicators |

### Implementation Approach

1. **Define AgentState enum**:
```typescript
// src/types/agent-state.ts
export enum AgentState {
  THINKING = "thinking",
  INDEXING = "indexing",
  READING = "reading",
  WRITING = "writing",
  EXECUTING = "executing",
  WAITING_PERMISSION = "waiting_permission",
  SUMMARIZING = "summarizing",
  COMPLETE = "complete",
  ERROR = "error"
}
```

2. **Add state tracking to lean-agent.ts**:
```typescript
let currentState: AgentState = AgentState.THINKING;

function setState(state: AgentState) {
  currentState = state;
  onEvent?.({ type: "state_change", state });
}

// Before each tool
setState(AgentState.READING);
const result = await executeTool("read", args, context);
setState(AgentState.THINKING);
```

3. **Add state callback to streaming events**:
```typescript
interface StreamEvent {
  type: "content_block_start" | "content_block_delta" | "content_block_stop" | "message_stop" | "needsContinuation" | "state_change";
  state?: AgentState;
  // ... other fields
}
```

4. **Update relay.ts to display states**:
```typescript
async function relayWithStates(prompt: string, message: Message) {
  const typingIndicator = await message.channel.send("🤔 Indexing...");
  
  await meow.prompt(prompt, {
    onStateChange: (state) => {
      const emojis = {
        [AgentState.THINKING]: "🤔",
        [AgentState.INDEXING]: "📚",
        [AgentState.READING]: "📖",
        [AgentState.WRITING]: "✏️",
        [AgentState.EXECUTING]: "⚡",
        [AgentState.WAITING_PERMISSION]: "⏳",
        [AgentState.SUMMARIZING]: "📝",
        [AgentState.COMPLETE]: "✅",
        [AgentState.ERROR]: "❌"
      };
      updateIndicator(typingIndicator, `${emojis[state]} ${state}`);
    }
  });
}
```

### Research Sources
- Vox agent patterns: Specific state indicators per operation
- Claude Code: Progress indicators during tool execution
- agent-kernel/src/core/lean-agent.ts - Where tool execution happens
- agent-harness/src/relay.ts - Where user feedback goes

## Implementation Location
- `agent-kernel/src/types/` - New agent-state.ts with enum
- `agent-kernel/src/sidecars/streaming.ts` - Add state_change to StreamEvent
- `agent-kernel/src/core/lean-agent.ts` - Add state tracking and callbacks
- `agent-harness/src/relay.ts` - Update to display state changes

## Status
📋 NOT YET IMPLEMENTED - Need to build this capability

**Current Status**: All 11 tests FAILED - capability needs to be implemented.

Epoch 17 implements rich agent state indicators from Vox patterns, enabling users to see exactly what the agent is doing during each phase of execution.

Epoch 17 implements rich agent state indicators from Vox patterns, enabling users to see exactly what the agent is doing during each phase of execution.
