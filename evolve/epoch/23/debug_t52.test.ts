import { describe, test, expect, beforeEach, afterEach, vi } from "bun:test";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR_PREFIX = "/tmp/test-epoch23-debug-t52";

function setupTestDir(): string {
  const testDir = `${TEST_DIR_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  mkdirSync(testDir, { recursive: true });
  mkdirSync(join(testDir, "sessions"), { recursive: true });
  return testDir;
}

function teardownTestDir(testDir: string) {
  try {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  } catch { /* ignore */ }
}

describe("Debug T5.2", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
    const { setSessionDir } = await import("../../src/core/session-store.ts");
    setSessionDir(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("Debug why summary marker is not in session", async () => {
    const { chatContext } = await import("../../src/core/chat-context.ts");
    const { createSession, appendToSession, loadSession, getSessionDir } = await import("../../src/core/session-store.ts");
    
    const sessionId = createSession();
    console.log("Session ID:", sessionId);
    console.log("Session dir:", getSessionDir());
    
    // Add 25 messages
    const msgs = Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Message ${i}`,
      timestamp: new Date().toISOString(),
    }));
    appendToSession(sessionId, msgs);
    
    console.log("After appendToSession, message count:", loadSession(sessionId).length);
    
    const compactResult = await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Trigger",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: async () => "Compacted conversation summary" });
    
    console.log("compactResult:", JSON.stringify(compactResult, null, 2));
    console.log("Has compactionResult:", !!compactResult.compactionResult);
    
    if (compactResult.compactionResult) {
      console.log("Result summary:", compactResult.compactionResult.summary);
      console.log("Original count:", compactResult.compactionResult.originalCount);
      console.log("Compacted count:", compactResult.compactionResult.compactedCount);
    }
    
    const sessionMessages = loadSession(sessionId);
    console.log("Session message count:", sessionMessages.length);
    console.log("Session messages:", JSON.stringify(sessionMessages.map(m => ({role: m.role, content: m.content.slice(0, 50), metadata: m.metadata})), null, 2));
    
    const hasSummaryMarker = sessionMessages.some(m => 
      m.content.includes("[Previous conversation summarized]")
    );
    console.log("Has summary marker:", hasSummaryMarker);
    
    expect(hasSummaryMarker).toBe(true);
  });
});
