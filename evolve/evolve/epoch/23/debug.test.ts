/**
 * Debug test for T4.4 and T6.1 failures
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { setSessionDir, createSession, appendToSession, loadSession, getSessionDir, COMPACT_THRESHOLD } from "../../src/core/session-store";
import { chatContext } from "../../src/core/chat-context";

const TEST_DIR_PREFIX = "/tmp/test-epoch23-debug";

function setupTestDir(): string {
  const testDir = `${TEST_DIR_PREFIX}-${Date.now()}`;
  mkdirSync(testDir, { recursive: true });
  return testDir;
}

function teardownTestDir(testDir: string) {
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

describe("Debug T4.4 and T6.1", () => {
  let testDir: string;
  
  beforeEach(() => {
    testDir = setupTestDir();
    setSessionDir(testDir);
    console.log("  [Setup] testDir:", testDir);
  });
  
  afterEach(() => {
    teardownTestDir(testDir);
  });
  
  test("T4.4 debug: non-existent session", async () => {
    console.log("  [Test] Session dir:", getSessionDir());
    
    const nonExistentId = `definitely-nonexistent-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const file = join(getSessionDir(), `${nonExistentId}.jsonl`);
    console.log("  [Test] Checking file:", file);
    console.log("  [Test] File exists:", existsSync(file));
    
    const result = await chatContext.triggerCompaction(nonExistentId, {
      summarizeFn: async () => "Summary"
    });
    
    console.log("  [Test] Result:", result);
    console.log("  [Test] Result === null:", result === null);
    
    // This is what T4.4 expects
    expect(result).toBeNull();
  });
  
  test("T6.1 debug: force compaction", async () => {
    const sessionId = createSession();
    console.log("  [Test] Created session:", sessionId);
    console.log("  [Test] COMPACT_THRESHOLD:", COMPACT_THRESHOLD);
    
    // Add 14 messages
    for (let i = 0; i < 14; i++) {
      appendToSession(sessionId, [{
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }]);
    }
    
    const messages = loadSession(sessionId);
    console.log("  [Test] Loaded messages count:", messages.length);
    
    const file = join(getSessionDir(), `${sessionId}.jsonl`);
    console.log("  [Test] Session file:", file);
    console.log("  [Test] File exists:", existsSync(file));
    
    const mockSummarize = vi.fn().mockResolvedValue("Manual compaction summary");
    
    const result = await chatContext.triggerCompaction(sessionId, {
      summarizeFn: mockSummarize,
    });
    
    console.log("  [Test] Result:", JSON.stringify(result, null, 2));
    console.log("  [Test] summarize called:", mockSummarize.mock.calls.length, "times");
    console.log("  [Test] mock calls:", mockSummarize.mock.calls);
    
    expect(mockSummarize).toHaveBeenCalled();
  });
});