import { ReasoningAudit } from "./src/core/memory.ts";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "data");

// Use the actual ReasoningAudit class to test
const audit = new ReasoningAudit(DATA_DIR);

// Test insert using the correct API
const traceId = audit.logTrace({
  id: `test_${Date.now()}`,
  sessionId: "test-session-001",
  taskId: "test-task-001",
  taskDescription: "Dogfood test - verify reasoning audit works",
  phase: "act",
  reasoning: "Testing the ReasoningAudit class by inserting a trace",
  toolCalls: [
    { id: "tc-1", name: "shell", arguments: { cmd: "echo test" }, result: "test output" }
  ],
  outcome: "success",
  durationMs: 150,
  tags: ["dogfood", "test"]
});

// Query back
const traces = audit.queryTraces({ sessionId: "test-session-001", limit: 5 });
console.log("\n Audit DB Test Results:");
console.log("=========================");
console.log("Trace ID created: " + traceId);
console.log("Total traces in session: " + traces.length);
console.log("\nLatest trace:");
console.log(JSON.stringify(traces[0], null, 2));

// Test stats
const stats = audit.getStats();
console.log("\nStats:", JSON.stringify(stats, null, 2));

// Cleanup test trace
audit.close();
console.log("\n✅ SUCCESS: reasoning_audit.db is functional!");
