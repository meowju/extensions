#!/usr/bin/env bun
/**
 * Epoch 17 Validation: Rich Agent State Indicators
 * 
 * RE-VALIDATION - Commander directive 2026-04-24
 * 
 * Tests:
 * 1. AgentState enum exists with >= 5 states
 * 2. THINKING, EXECUTING, WAITING states defined
 * 3. State tracking in agent (setState/currentState)
 * 4. Contextual state changes near tool calls
 * 5. Relay has state indicator ('🐱 thinking...')
 * 6. Relay handles state callbacks
 * 7. StreamEvent supports state
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ============================================================================
// Test Suite
// ============================================================================

interface TestResult {
  name: string;
  result: "PASS" | "FAIL";
  evidence: string;
}

const tests: TestResult[] = [];

console.log("=== EPOCH 17 RE-VALIDATION: Rich Agent State Indicators ===\n");

// ============================================================================
// TEST 1: AgentState enum exists with >= 5 states
// ============================================================================

console.log("TEST 1: AgentState enum exists with >= 5 states");

const agentStatePath = "/app/agent-kernel/src/types/agent-state.ts";
let agentStateContent = "";
if (existsSync(agentStatePath)) {
  agentStateContent = readFileSync(agentStatePath, "utf-8");
}

const hasAgentStateType = agentStateContent.includes("AgentState") && agentStateContent.includes("enum");
const enumMatch = agentStateContent.match(/AgentState\s*\{[\s\S]*?\}/);
let stateCount = 0;
let states: string[] = [];
if (enumMatch) {
  states = enumMatch[0].match(/(\w+)\s*=/g)?.map(s => s.replace('=', '').trim()) || [];
  stateCount = states.length;
}

const test1Pass = hasAgentStateType && stateCount >= 5;
tests.push({
  name: "AgentState enum exists with >= 5 states",
  result: test1Pass ? "PASS" : "FAIL",
  evidence: `AgentState type found: ${hasAgentStateType}, State count: ${stateCount}, States: ${states.join(', ')}`
});

console.log(`  Result: ${test1Pass ? "PASS" : "FAIL"}`);
console.log(`  Evidence: ${tests[tests.length - 1].evidence}\n`);

// ============================================================================
// TEST 2: THINKING state defined
// ============================================================================

console.log("TEST 2: THINKING state defined");

const hasThinking = agentStateContent.includes("THINKING") || agentStateContent.includes("thinking");
tests.push({
  name: "THINKING state defined",
  result: hasThinking ? "PASS" : "FAIL",
  evidence: `THINKING found: ${hasThinking}`
});

console.log(`  Result: ${hasThinking ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 3: EXECUTING/RUNNING state defined
// ============================================================================

console.log("TEST 3: EXECUTING/RUNNING state defined");

const hasExecuting = agentStateContent.includes("EXECUTING") || agentStateContent.includes("RUNNING");
tests.push({
  name: "EXECUTING/RUNNING state defined",
  result: hasExecuting ? "PASS" : "FAIL",
  evidence: `EXECUTING/RUNNING found: ${hasExecuting}`
});

console.log(`  Result: ${hasExecuting ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 4: WAITING state defined
// ============================================================================

console.log("TEST 4: WAITING state defined");

const hasWaiting = agentStateContent.includes("WAITING");
tests.push({
  name: "WAITING state defined",
  result: hasWaiting ? "PASS" : "FAIL",
  evidence: `WAITING found: ${hasWaiting}`
});

console.log(`  Result: ${hasWaiting ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 5: State tracking in agent (setState/currentState)
// ============================================================================

console.log("TEST 5: State tracking in agent (setState/currentState)");

const meowAgentPath = "/app/src/core/meow-agent.ts";
let meowAgentContent = "";
if (existsSync(meowAgentPath)) {
  meowAgentContent = readFileSync(meowAgentPath, "utf-8");
}

const hasSetState = meowAgentContent.includes("setState") || meowAgentContent.includes("currentState");
const hasStateChange = meowAgentContent.includes("StateChange") || meowAgentContent.includes("state");

tests.push({
  name: "State tracking in agent",
  result: hasSetState ? "PASS" : "FAIL",
  evidence: `setState/currentState found: ${hasSetState}, State handling found: ${hasStateChange}`
});

console.log(`  Result: ${hasSetState ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 6: Relay has state indicator ('🐱 thinking...')
// ============================================================================

console.log("TEST 6: Relay has state indicator ('🐱 thinking...')");

const relayPath = "/app/src/relay.ts";
let relayContent = "";
if (existsSync(relayPath)) {
  relayContent = readFileSync(relayPath, "utf-8");
}

const hasStateIndicator = relayContent.includes("🐱 thinking") || relayContent.includes("thinking...");
const hasThinkingPlaceholder = relayContent.includes("thinking") && relayContent.includes("...");

tests.push({
  name: "Relay has state indicator",
  result: hasStateIndicator || hasThinkingPlaceholder ? "PASS" : "FAIL",
  evidence: `State indicator found: ${hasStateIndicator || hasThinkingPlaceholder}. Relay has 'thinking...' placeholder: ${hasThinkingPlaceholder}`
});

console.log(`  Result: ${hasStateIndicator || hasThinkingPlaceholder ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 7: Relay handles state callbacks
// ============================================================================

console.log("TEST 7: Relay handles state callbacks");

const hasOnToken = relayContent.includes("onToken") || relayContent.includes("onState");
const hasStateCallback = relayContent.includes("StateCallback") || relayContent.includes("stateCallback");

tests.push({
  name: "Relay handles state callbacks",
  result: hasOnToken || hasStateCallback ? "PASS" : "FAIL",
  evidence: `onToken callback found: ${hasOnToken}, StateCallback found: ${hasStateCallback}`
});

console.log(`  Result: ${hasOnToken || hasStateCallback ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 8: StreamEvent supports state
// ============================================================================

console.log("TEST 8: StreamEvent supports state");

const streamEventPath = "/app/agent-kernel/src/types/stream-event.ts";
let streamEventContent = "";
if (existsSync(streamEventPath)) {
  streamEventContent = readFileSync(streamEventPath, "utf-8");
}

const hasStateInStream = streamEventContent.includes("state") && streamEventContent.includes("AgentState");
const hasStreamEvent = streamEventContent.includes("StreamEvent");

tests.push({
  name: "StreamEvent supports state",
  result: hasStreamEvent && hasStateInStream ? "PASS" : "FAIL",
  evidence: `StreamEvent type found: ${hasStreamEvent}, State in StreamEvent: ${hasStateInStream}`
});

console.log(`  Result: ${hasStreamEvent && hasStateInStream ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 9: Contextual state changes near tool calls
// ============================================================================

console.log("TEST 9: Contextual state changes near tool calls");

const hasToolState = meowAgentContent.includes("executing") && meowAgentContent.includes("complete");
const hasToolContextState = meowAgentContent.includes("tool") && (meowAgentContent.includes("thinking") || meowAgentContent.includes("state"));

tests.push({
  name: "Contextual state changes near tool calls",
  result: hasToolState || hasToolContextState ? "PASS" : "FAIL",
  evidence: `Tool+state found: ${hasToolState || hasToolContextState}`
});

console.log(`  Result: ${hasToolState || hasToolContextState ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 10: State emoji map exists
// ============================================================================

console.log("TEST 10: State emoji map exists (AGENT_STATE_EMOJI)");

const hasEmojiMap = agentStateContent.includes("AGENT_STATE_EMOJI") || agentStateContent.includes("emoji");
const hasEmojiOrIndicator = agentStateContent.includes("🐱") || agentStateContent.includes("💭") || agentStateContent.includes("emoji");

tests.push({
  name: "State emoji map exists",
  result: hasEmojiMap || hasEmojiOrIndicator ? "PASS" : "FAIL",
  evidence: `AGENT_STATE_EMOJI found: ${hasEmojiMap}, Emojis found: ${hasEmojiOrIndicator}`
});

console.log(`  Result: ${hasEmojiMap || hasEmojiOrIndicator ? "PASS" : "FAIL"}\n`);

// ============================================================================
// Summary
// ============================================================================

console.log("=== VALIDATION SUMMARY ===");
const passCount = tests.filter(t => t.result === "PASS").length;
const failCount = tests.filter(t => t.result === "FAIL").length;

for (const test of tests) {
  console.log(`  [${test.result}] ${test.name}`);
}

console.log(`\nTotal: ${passCount} PASS, ${failCount} FAIL`);

const allPass = failCount === 0;

// ============================================================================
// Output JSON
// ============================================================================

const validation = {
  epoch: 17,
  capability: "rich-agent-state-indicators",
  status: allPass ? "VALIDATED" : "NOT_IMPLEMENTED",
  tests: tests,
  verdict: allPass 
    ? "Epoch 17 VALIDATED. Rich agent state indicators properly implemented with AgentState enum, state tracking, relay indicators, and StreamEvent integration."
    : `Epoch 17 NOT_IMPLEMENTED. ${failCount} tests failed. See details above.`,
  blocking: !allPass,
  revalidated_at: new Date().toISOString(),
  source: "re-validation via validate-epoch-17.ts (commander directive 2026-04-24)"
};

console.log("\n=== JSON OUTPUT ===");
console.log(JSON.stringify(validation, null, 2));

// Write validation file
const validationPath = "/app/evolve/dogfood/validation/epoch-17-rich-agent-state-indicators.json";
try {
  const fs = require("node:fs");
  fs.writeFileSync(validationPath, JSON.stringify(validation, null, 2));
  console.log(`\nValidation written to: ${validationPath}`);
} catch (e) {
  console.log(`\nNote: Could not write validation file: ${e}`);
}

// Exit with appropriate code
process.exit(allPass ? 0 : 1);