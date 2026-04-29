#!/usr/bin/env bun
/**
 * Epoch 18 Validation: Relay State Indicator Integration
 * 
 * RE-VALIDATION - Commander directive 2026-04-24
 * 
 * Tests:
 * 1. Relay has state indicator ('🐱 thinking...')
 * 2. Relay handles state callbacks (onToken)
 * 3. RELAY_STREAMING wired to main flow
 * 4. meow-agent.ts supports streaming (promptStreaming)
 * 5. meow-stream.ts exists
 * 6. TokenBuffer code fence aware
 * 7. State change event type exists
 */

import { existsSync, readFileSync } from "node:fs";

// ============================================================================
// Test Suite
// ============================================================================

interface TestResult {
  name: string;
  result: "PASS" | "FAIL";
  evidence: string;
}

const tests: TestResult[] = [];

console.log("=== EPOCH 18 RE-VALIDATION: Relay State Indicator Integration ===\n");

// ============================================================================
// TEST 1: Relay has state indicator ('🐱 thinking...')
// ============================================================================

console.log("TEST 1: Relay has state indicator ('🐱 thinking...')");

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
// TEST 2: Relay handles state callbacks
// ============================================================================

console.log("TEST 2: Relay handles state callbacks");

const hasOnToken = relayContent.includes("onToken");
const hasStateCallback = relayContent.includes("StateCallback") || relayContent.includes("stateCallback");

tests.push({
  name: "Relay handles state callbacks",
  result: hasOnToken || hasStateCallback ? "PASS" : "FAIL",
  evidence: `onToken callback found: ${hasOnToken}, StateCallback found: ${hasStateCallback}`
});

console.log(`  Result: ${hasOnToken || hasStateCallback ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 3: RELAY_STREAMING wired to main flow
// ============================================================================

console.log("TEST 3: RELAY_STREAMING wired to main flow");

const hasRelayStreaming = relayContent.includes("RELAY_STREAMING");
const hasStreamingConditional = relayContent.includes("sendStreamingMessage");

tests.push({
  name: "RELAY_STREAMING wired to main flow",
  result: hasRelayStreaming && hasStreamingConditional ? "PASS" : "FAIL",
  evidence: `RELAY_STREAMING defined: ${hasRelayStreaming}, sendStreamingMessage called: ${hasStreamingConditional}`
});

console.log(`  Result: ${hasRelayStreaming && hasStreamingConditional ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 4: meow-agent.ts supports streaming
// ============================================================================

console.log("TEST 4: meow-agent.ts supports streaming (promptStreaming)");

const meowAgentPath = "/app/src/core/meow-agent.ts";
let meowAgentContent = "";
if (existsSync(meowAgentPath)) {
  meowAgentContent = readFileSync(meowAgentPath, "utf-8");
}

const hasPromptStreaming = meowAgentContent.includes("promptStreaming");
const hasStreamSupport = meowAgentContent.includes("streaming") || meowAgentContent.includes("Stream");

tests.push({
  name: "meow-agent.ts supports streaming",
  result: hasPromptStreaming || hasStreamSupport ? "PASS" : "FAIL",
  evidence: `promptStreaming method found: ${hasPromptStreaming}, Streaming support found: ${hasStreamSupport}`
});

console.log(`  Result: ${hasPromptStreaming || hasStreamSupport ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 5: meow-stream.ts exists
// ============================================================================

console.log("TEST 5: meow-stream.ts exists");

const meowStreamPath = "/app/src/meow-stream.ts";
const meowStreamExists = existsSync(meowStreamPath);

tests.push({
  name: "meow-stream.ts exists",
  result: meowStreamExists ? "PASS" : "FAIL",
  evidence: `meow-stream.ts exists: ${meowStreamExists}`
});

console.log(`  Result: ${meowStreamExists ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 6: TokenBuffer code fence aware
// ============================================================================

console.log("TEST 6: TokenBuffer code fence aware");

const hasTokenBufferImport = relayContent.includes("TokenBuffer") && relayContent.includes("from");
const hasCodeFenceAware = relayContent.includes("codeFenceAware") || relayContent.includes("codeFence");

tests.push({
  name: "TokenBuffer code fence aware",
  result: hasTokenBufferImport && hasCodeFenceAware ? "PASS" : "FAIL",
  evidence: `TokenBuffer imported: ${hasTokenBufferImport}, codeFenceAware option: ${hasCodeFenceAware}`
});

console.log(`  Result: ${hasTokenBufferImport && hasCodeFenceAware ? "PASS" : "FAIL"}\n`);

// ============================================================================
// TEST 7: State change event type exists
// ============================================================================

console.log("TEST 7: State change event type exists");

const agentStatePath = "/app/agent-kernel/src/types/agent-state.ts";
let agentStateContent = "";
if (existsSync(agentStatePath)) {
  agentStateContent = readFileSync(agentStatePath, "utf-8");
}

const hasStateChangeEvent = agentStateContent.includes("StateChangeEvent") || agentStateContent.includes("state_change");

tests.push({
  name: "State change event type exists",
  result: hasStateChangeEvent ? "PASS" : "FAIL",
  evidence: `StateChangeEvent interface found: ${hasStateChangeEvent}`
});

console.log(`  Result: ${hasStateChangeEvent ? "PASS" : "FAIL"}\n`);

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
  epoch: 18,
  capability: "relay-state-indicator-integration",
  status: allPass ? "VALIDATED" : "NOT_IMPLEMENTED",
  tests: tests,
  verdict: allPass 
    ? "Epoch 18 VALIDATED. Relay state indicator integration complete."
    : `Epoch 18 NOT_IMPLEMENTED. ${failCount} tests failed. See details above.`,
  blocking: !allPass,
  revalidated_at: new Date().toISOString(),
  source: "re-validation via validate-epoch-18.ts (commander directive 2026-04-24)"
};

console.log("\n=== JSON OUTPUT ===");
console.log(JSON.stringify(validation, null, 2));

// Write validation file
const validationPath = "/app/evolve/dogfood/validation/epoch-18-relay-state-indicator-integration.json";
try {
  const fs = require("node:fs");
  fs.writeFileSync(validationPath, JSON.stringify(validation, null, 2));
  console.log(`\nValidation written to: ${validationPath}`);
} catch (e) {
  console.log(`\nNote: Could not write validation file: ${e}`);
}

// Exit with appropriate code
process.exit(allPass ? 0 : 1);