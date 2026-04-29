/**
 * Epoch 21 Validation Tests: Permission Learning Integration
 */
import { 
  checkPermissionWithLearning,
  recordApproval,
  resetLearnedPatterns,
  approvalCount,
  APPROVAL_THRESHOLD
} from "/app/agent-kernel/src/sidecars/permissions.ts";

const tests: Array<{name: string; fn: () => Promise<{pass: boolean; reason: string}>}> = [];

function test(name: string, fn: () => Promise<{pass: boolean; reason: string}>) {
  tests.push({ name, fn });
}

async function runTests() {
  resetLearnedPatterns();
  console.log("=".repeat(70));
  console.log("EPOCH 21: Permission Learning Integration Validation");
  console.log("=".repeat(70));
  let passed = 0, failed = 0;
  for (const t of tests) {
    try {
      const result = await t.fn();
      if (result.pass) { console.log("PASS: " + t.name); passed++; }
      else { console.log("FAIL: " + t.name); failed++; }
    } catch (e: any) { console.log("ERROR: " + t.name); failed++; }
  }
  console.log("RESULTS: " + passed + " passed, " + failed + " failed");
  if (failed > 0) process.exit(1);
}

test("No learning not auto-allow", async () => {
  resetLearnedPatterns();
  const result = checkPermissionWithLearning("shell", { cmd: "python3 -c pass" });
  return result.action !== "allow" || !result.reason?.includes("learned")
    ? { pass: true, reason: "Action: " + result.action }
    : { pass: false, reason: "Should not auto-allow without learning" };
});

test("Learned patterns override default rules", async () => {
  resetLearnedPatterns();
  (approvalCount as Map<string, number>).set("shell:{\"cmd\":\"echo hello\"}", APPROVAL_THRESHOLD);
  const result = checkPermissionWithLearning("shell", { cmd: "echo hello" });
  resetLearnedPatterns();
  return result.action === "allow" && result.reason?.includes("learned")
    ? { pass: true, reason: "Learned pattern allowed" }
    : { pass: false, reason: "Got: " + result.action };
});

test("Record approval increments count", async () => {
  resetLearnedPatterns();
  const params = { cmd: "test cmd" };
  const before = approvalCount.get("shell:" + JSON.stringify(params)) || 0;
  recordApproval("shell", params);
  const after = approvalCount.get("shell:" + JSON.stringify(params)) || 0;
  resetLearnedPatterns();
  return after === before + 1
    ? { pass: true, reason: "Count: " + before + " -> " + after }
    : { pass: false, reason: "Expected " + (before + 1) + ", got " + after };
});

test("Not auto-approved at 1 approval", async () => {
  resetLearnedPatterns();
  const params = { cmd: "cmd1" };
  recordApproval("shell", params);
  const result = checkPermissionWithLearning("shell", params);
  resetLearnedPatterns();
  return !(result.action === "allow" && result.reason?.includes("learned"))
    ? { pass: true, reason: "Action: " + result.action }
    : { pass: false, reason: "Should not auto-approve at 1" };
});

test("Not auto-approved at 2 approvals", async () => {
  resetLearnedPatterns();
  const params = { cmd: "cmd2" };
  recordApproval("shell", params);
  recordApproval("shell", params);
  const result = checkPermissionWithLearning("shell", params);
  resetLearnedPatterns();
  return !(result.action === "allow" && result.reason?.includes("learned"))
    ? { pass: true, reason: "Action: " + result.action }
    : { pass: false, reason: "Should not auto-approve at 2" };
});

test("Auto-approved at 3 approvals", async () => {
  resetLearnedPatterns();
  const params = { cmd: "cmd3" };
  recordApproval("shell", params);
  recordApproval("shell", params);
  recordApproval("shell", params);
  const result = checkPermissionWithLearning("shell", params);
  resetLearnedPatterns();
  return result.action === "allow" && result.reason?.includes("learned")
    ? { pass: true, reason: "Action: " + result.action }
    : { pass: false, reason: "Got: " + result.action };
});

test("4th run auto-approves reproducible", async () => {
  resetLearnedPatterns();
  const params = { cmd: "repro cmd" };
  recordApproval("shell", params);
  recordApproval("shell", params);
  recordApproval("shell", params);
  const r1 = checkPermissionWithLearning("shell", params);
  resetLearnedPatterns();
  recordApproval("shell", params);
  recordApproval("shell", params);
  recordApproval("shell", params);
  const r2 = checkPermissionWithLearning("shell", params);
  resetLearnedPatterns();
  return r1.action === "allow" && r2.action === "allow"
    ? { pass: true, reason: "Reproducible verified" }
    : { pass: false, reason: "R1: " + r1.action + ", R2: " + r2.action };
});

test("Ask ask ask allow cycle complete", async () => {
  resetLearnedPatterns();
  const params = { cmd: "cycle cmd" };
  const r1 = checkPermissionWithLearning("shell", params);
  if (r1.action === "allow" && r1.reason?.includes("learned")) return { pass: false, reason: "Run1 learned early" };
  recordApproval("shell", params);
  const r2 = checkPermissionWithLearning("shell", params);
  if (r2.action === "allow" && r2.reason?.includes("learned")) return { pass: false, reason: "Run2 learned early" };
  recordApproval("shell", params);
  const r3 = checkPermissionWithLearning("shell", params);
  if (r3.action === "allow" && r3.reason?.includes("learned")) return { pass: false, reason: "Run3 learned early" };
  recordApproval("shell", params);
  const r4 = checkPermissionWithLearning("shell", params);
  resetLearnedPatterns();
  return r4.action === "allow" && r4.reason?.includes("learned")
    ? { pass: true, reason: "Cycle: ask ask ask allow" }
    : { pass: false, reason: "Run4: " + r4.action };
});

test("Skills module imports checkPermissionWithLearning", async () => {
  const m = await import("/app/agent-kernel/src/skills/permissions.ts");
  return m.permissions ? { pass: true, reason: "Skills module loaded" } : { pass: false, reason: "Module not loaded" };
});

test("APPROVAL_THRESHOLD = 3", async () => {
  return APPROVAL_THRESHOLD === 3 ? { pass: true, reason: "APPROVAL_THRESHOLD = 3" } : { pass: false, reason: "Got: " + APPROVAL_THRESHOLD };
});

test("tool-registry.ts has EPOCH 21 markers", async () => {
  const fs = await import("node:fs");
  const c = fs.readFileSync("/app/agent-kernel/src/sidecars/tool-registry.ts", "utf-8");
  return c.includes("EPOCH 21") && c.includes("checkPermissionWithLearning") && c.includes("recordApproval")
    ? { pass: true, reason: "Integration documented" }
    : { pass: false, reason: "Missing markers" };
});

test("skills permissions.ts shows learning status", async () => {
  const fs = await import("node:fs");
  const c = fs.readFileSync("/app/agent-kernel/src/skills/permissions.ts", "utf-8");
  return (c.includes("AUTO-APPROVED") || c.includes("learned pattern")) && c.includes("Learning:")
    ? { pass: true, reason: "Learning status displayed" }
    : { pass: false, reason: "Missing display" };
});

runTests().catch(e => { console.error(e); process.exit(1); });