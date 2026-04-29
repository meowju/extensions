=== EPOCH PROMISE ===

## Capability to Implement
Relay State Indicator Integration + State Callback Handling

## What It Does
Completes Epoch 17's "Rich Agent State Indicators" capability by wiring the existing `AgentState` enum into relay.ts, enabling users to see real-time agent states (Thinking, Indexing, Executing, Waiting) during execution.

## Implementation Criteria (how DOGFOOD will validate)
1. **Test: Relay has state indicator** - relay.ts displays state indicators (e.g., "🤔 Thinking...", "⚡ Executing...")
2. **Test: Relay handles state callbacks** - relay.ts has onStateChange callback handler
3. **Test: RELAY_STREAMING wired to main flow** - Streaming conditional actually calls sendStreamingMessage (from Epoch 10 fix)
4. **Must be reproducible** - Run validation test to confirm all tests pass

## From Research: Vox + Claude Code (Primary Sources)

### Vox's Rich Agent States Pattern
Vox shows specific states, not just "thinking":
- "Indexing codebase..."
- "Executing command..."
- "Waiting for permission..."
- "Summarizing context..."

### Claude Code's Progress Indicators
Claude Code shows progress indicators:
- Thinking indicator during tool planning
- "Reading files..." during file operations
- "Running command..." during shell execution

### Epoch 17's Existing Implementation
The AgentState enum already exists in `/app/agent-kernel/src/types/agent-state.ts`:
```typescript
export enum AgentState {
  THINKING = "thinking",
  INDEXING = "indexing",
  READING = "reading",
  WRITING = "writing",
  EXECUTING = "executing",
  WAITING_PERMISSION = "waiting_permission",
  SUMMARIZING = "summarizing",
  COMPLETE = "complete",
  ERROR = "error",
}

export const AGENT_STATE_EMOJI: Record<AgentState, string> = {
  [AgentState.THINKING]: "🤔",
  [AgentState.INDEXING]: "📚",
  [AgentState.READING]: "📖",
  // ... etc
};
```

### What's Missing (Epoch 17 Validation Failures)
From `epoch-17-rich-agent-state-indicators.json`:
1. ❌ "Relay has state indicator or thinking placeholder" - FAIL
2. ❌ "Relay handles state callback/updates" - FAIL
3. ❌ RELAY_STREAMING not wired to main flow (Epoch 10 issue)

### Implementation Approach

1. **Add state callback to meow.prompt()** in meow-agent.ts:
```typescript
async prompt(prompt: string, options?: { onStateChange?: (state: AgentState) => void }): Promise<string>
```

2. **Wire relay.ts to handle state changes**:
```typescript
reply = await meow.prompt(fullPrompt, {
  onStateChange: (state) => {
    updateTypingIndicator(state); // Show emoji + state name
  }
});
```

3. **Add typing indicator with state display**:
```typescript
async function updateTypingIndicator(state: AgentState) {
  const emoji = AGENT_STATE_EMOJI[state];
  const description = AGENT_STATE_DESCRIPTION[state];
  await typingIndicator.edit(`${emoji} ${description}`);
}
```

4. **Wire RELAY_STREAMING conditional** (Epoch 10 fix):
```typescript
// In relay.ts main message handler (~line 1179)
if (RELAY_STREAMING) {
  try {
    reply = await sendStreamingMessage(meow, message, fullPrompt, onStateChange);
  } catch (streamingErr) {
    console.warn(`[relay] Streaming failed, falling back: ${streamingErr.message}`);
    reply = await meow.prompt(fullPrompt, { onStateChange });
  }
} else {
  reply = await meow.prompt(fullPrompt, { onStateChange });
}
```

## Research Sources
- `/app/agent-kernel/src/types/agent-state.ts` - Existing AgentState enum (8 states + emojis)
- `/app/agent-kernel/src/types/agent-state.ts` - AGENT_STATE_DESCRIPTION map
- `/app/agent-harness/src/relay.ts` - Where state indicators need to be added
- `/app/agent-harness/src/core/meow-agent.ts` - Where onStateChange callback needs to be supported
- `epoch-17-rich-agent-state-indicators.json` - Dogfood validation showing exact failures

## Implementation Location
- `agent-harness/src/relay.ts` - Add state indicator display + callback handling + RELAY_STREAMING wiring
- `agent-harness/src/core/meow-agent.ts` - Add onStateChange option to prompt() signature

## Status
📋 EPOCH 18 IN PROGRESS - Focus on completing Epoch 17's relay integration

**Epoch 17 prerequisite**: This epoch completes Epoch 17 (Rich Agent State Indicators) by adding the relay integration that was missing.

**After validation**: Once Epoch 17/18 combined capability passes validation, EVOLVE can proceed to Epoch 19 with a new capability.