/**
 * Isolated test that replicates T4.4 and T6.1 exactly
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// Identical setup to validation.test.ts
const TEST_DIR_PREFIX = "/tmp/test-epoch23-isolated";

function setupTestDir(): string {
  const testDir = `${TEST_DIR_PREFIX}-${Date.now()}`;
  mkdirSync(testDir, { recursive: true });
  return testDir;
}

function teardownTestDir(testDir: string) {
  try {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  } catch { /* ignore cleanup errors */ }
}

describe("EPOCH 23: T4.4 Isolated", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
    const { setSessionDir } = await import("../../src/core/session-store");
    setSessionDir(testDir);
    console.log("  [Setup] testDir:", testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T4.4: triggerCompaction handles non-existent session", async () => {
    const { chatContext } = await import("../../src/core/chat-context");
    const { getSessionDir } = await import("../../src/core/session-store");
    
    const nonExistentId = `definitely-nonexistent-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    console.log("  [T4.4] testDir:", testDir);
    console.log("  [T4.4] getSessionDir():", getSessionDir());
    console.log("  [T4.4] nonExistentId:", nonExistentId);
    console.log("  [T4.4] file would be:", join(getSessionDir(), `${nonExistentId}.jsonl`));
    console.log("  [T4.4] file exists:", existsSync(join(getSessionDir(), `${nonExistentId}.jsonl`)));
    
    const result = await chatContext.triggerCompaction(nonExistentId, {
      summarizeFn: async () => "Summary"
    });
    
    console.log("  [T4.4] Result:", result);
    
    expect(result).toBeNull();
  });
});

describe("EPOCH 23: T6.1 Isolated", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
    const { setSessionDir } = await import("../../src/core/session-store");
    setSessionDir(testDir);
    console.log("  [Setup] testDir:", testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T6.1: triggerCompaction forces compaction regardless of threshold", async () => {
    const { chatContext } = await import("../../src/core/chat-context");
    const { createSession, appendToSession, loadSession } = await import("../../src/core/session-store");
    
    const sessionId = createSession();
    console.log("  [T6.1] sessionId:", sessionId);
    
    // Add 14 messages
    appendToSession(sessionId, Array.from({ length: 14 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    const initialCount = loadSession(sessionId).length;
    console.log("  [T6.1] initialCount:", initialCount);
    expect(initialCount).toBe(14);
    
    const mockSummarize = vi.fn().mockResolvedValue("Manual compaction summary");
    
    console.log("  [T6.1] Calling triggerCompaction...");
    const result = await chatContext.triggerCompaction(sessionId, {
      summarizeFn: mockSummarize,
    });
    
    console.log("  [T6.1] result:", JSON.stringify(result, (k, v) => k === 'messages' ? '[messages]' : v, 2));
    console.log("  [T6.1] mockSummarize.callCount:", mockSummarize.mock.calls.length);
    
    expect(mockSummarize).toHaveBeenCalled();
    expect(result.compactedCount).toBeLessThan(result.originalCount);
    expect(result.originalCount).toBe(14);
  });
});