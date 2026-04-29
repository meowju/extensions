# Epoch 17 Architecture: AgentState WAITING State

## GAP Analysis

**Gap ID:** GAP-UI-003 (Progress Indicators)

**Issue:** AgentState enum missing WAITING state, relay.ts lacks state indicator, and state callback handling not wired up properly.

## Architecture

### AgentState Enum

The `AgentState` enum in `agent-kernel/src/types/agent-state.ts` defines all agent execution states:

```typescript
export enum AgentState {
  THINKING = "thinking",
  INDEXING = "indexing", 
  READING = "reading",
  WRITING = "writing",
  EXECUTING = "executing",
  WAITING_PERMISSION = "waiting_permission",  // Existing
  WAITING = "waiting",                         // NEW: Generic waiting state
  SUMMARIZING = "summarizing",
  COMPLETE = "complete",
  ERROR = "error",
}
```

### State Display Maps

```typescript
export const AGENT_STATE_EMOJI: Record<AgentState, string> = {
  [AgentState.THINKING]: "🤔",
  [AgentState.INDEXING]: "📚",
  [AgentState.READING]: "📖",
  [AgentState.WRITING]: "✏️",
  [AgentState.EXECUTING]: "⚡",
  [AgentState.WAITING_PERMISSION]: "⏳",
  [AgentState.WAITING]: "⏳",                    // NEW
  [AgentState.SUMMARIZING]: "📝",
  [AgentState.COMPLETE]: "✅",
  [AgentState.ERROR]: "❌",
};

export const AGENT_STATE_DESCRIPTION: Record<AgentState, string> = {
  [AgentState.WAITING]: "Waiting...",          // NEW
  // ... other descriptions
};
```

### StateChangeEvent Interface

```typescript
export interface StateChangeEvent {
  type: "state_change";
  state: AgentState;
  message?: string;  // Optional custom message
}
```

### Relay.ts Integration

The relay.ts file handles Discord message updates:

```typescript
import { AgentState, AGENT_STATE_EMOJI, AGENT_STATE_DESCRIPTION } 
  from "/app/agent-kernel/src/types/agent-state.ts";

// State change handler
async function handleStateChange(
  responseMessage: Message,
  state: AgentState,
  stateMessage?: string
): Promise<void> {
  const emoji = AGENT_STATE_EMOJI[state] || "🐱";
  const description = stateMessage || AGENT_STATE_DESCRIPTION[state] || "...";
  const statusText = `${emoji} ${description}`;
  
  try {
    await responseMessage.edit(statusText);
  } catch {
    // Ignore edit failures (message too old, rate limited)
  }
}

// In sendStreamingMessage:
const onStateChange = (state: AgentState, stateMessage?: string) => {
  handleStateChange(responseMessage, state, stateMessage);
};

fullContent = await meow.promptStreaming(
  prompt,
  (token) => { /* token handling */ },
  onStateChange  // NEW: State change callback
);
```

### Call Chain

```
MeowAgentClient.promptStreaming(prompt, onToken, onStateChange)
    ↓
runLeanAgentStream() with onStateChange callback
    ↓
StreamResponse events with state: AgentState
    ↓
onStateChange(state, message) → handleStateChange()
    ↓
Discord message.edit(emoji + description)
```

## Test Coverage

See `dogfood/epoch-17-agent-state-waiting.test.ts`

### T1: WAITING State in AgentState Enum
- T1.1: Enum includes WAITING state
- T1.2: Enum is exported
- T1.3: WAITING distinct from other states

### T2: WAITING State Emoji and Description
- T2.1: AGENT_STATE_EMOJI includes WAITING
- T2.2: AGENT_STATE_DESCRIPTION includes WAITING
- T2.3: Emoji appropriate for waiting (hourglass/clock)

### T3: State Indicator in relay.ts
- T3.1: relay.ts imports AgentState
- T3.2: relay.ts imports AGENT_STATE_EMOJI
- T3.3: relay.ts imports AGENT_STATE_DESCRIPTION
- T3.4: handleStateChange function exists
- T3.5: handleStateChange updates Discord message

### T4: State Callback Handling
- T4.1: onStateChange callback in sendStreamingMessage
- T4.2: onStateChange called with state and message
- T4.3: promptStreaming accepts onStateChange
- T4.4: Callback wires to handleStateChange

### T5: Rich State Indicators
- T5.1: sendStreamingMessage starts with thinking indicator
- T5.2: State changes update message content
- T5.3: EPOCH 17 comment present

### T6: All States Have Mappings
- T6.1: All enum states have emoji
- T6.2: All enum states have description

## Implementation Status

✅ IMPLEMENTED:
- `AgentState.WAITING` in enum
- `AGENT_STATE_EMOJI[AgentState.WAITING]` = "⏳"
- `AGENT_STATE_DESCRIPTION[AgentState.WAITING]`
- `handleStateChange()` in relay.ts
- `onStateChange` callback wiring in relay.ts

🔲 PARTIALLY IMPLEMENTED:
- `promptStreaming` in meow-agent.ts may need onStateChange support
- Full state change events from LeanAgentCore

## Files Modified

- `agent-kernel/src/types/agent-state.ts` - WAITING state added
- `src/relay.ts` - handleStateChange() and callback wiring
- `src/core/meow-agent.ts` - promptStreaming with onStateChange (if needed)