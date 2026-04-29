import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR_PREFIX = "/tmp/test-epoch23-debug-t52v";

function setupTestDir(): string {
  const testDir = `${TEST_DIR_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  mkdirSync(testDir, { recursive: true });
  return testDir;
}

function teardownTestDir(testDir: string) {
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

describe("Debug T5.2 validation style", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
    // Use testDir as-is (validation test uses this style)
    const { setSessionDir } = await import("../../src/core/session-store.ts");
    setSessionDir(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("Test without sessions subdirectory", async () => {
    const { chatContext } = await import("../../src/core/chat-context.ts");
    const { createSession, appendToSession, loadSession, getSessionDir } = await import("../../src/core/session-store.ts");
    
    const sessionId = createSession();
    console.log("Session ID:", sessionId);
    console.log("TestDir:", testDir);
    console.log("getSessionDir():", getSessionDir());
    
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
    
    console.log("compactResult.compactionResult:", !!compactResult.compactionResult);
    
    const sessionMessages = loadSession(sessionId);
    console.log("Session message count:", sessionMessages.length);
    console.log("Session contents:", sessionMessages.map(m => m.content.slice(0, 30)));
    
    const hasSummaryMarker = sessionMessages.some(m => 
      m.content.includes("[Previous conversation summarized]")
    );
    console.log("Has summary marker:", hasSummaryMarker);
    
    expect(hasSummaryMarker).toBe(true);
  });
});
