import { describe, test, expect, beforeEach, afterEach, vi } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR_PREFIX = "/tmp/test-epoch23-debug";

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

describe("DEBUG T5.2 V2", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
    const { setSessionDir } = await import("../src/core/session-store.ts");
    setSessionDir(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("Debug hasSummary detection", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession, loadSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    
    // Add enough messages to trigger compaction
    appendToSession(sessionId, Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    // Check messages before compaction
    const messagesBefore = loadSession(sessionId);
    console.log("=== Messages before compaction:", messagesBefore.length);
    
    const compactResult = await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Trigger",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: async () => "Compacted conversation summary" });
    
    console.log("=== Compaction result:", JSON.stringify(compactResult.compactionResult, null, 2));
    
    // Check messages after compaction
    const messagesAfter = loadSession(sessionId);
    console.log("=== Messages after compaction:", messagesAfter.length);
    
    // Check for summary markers in messages
    console.log("=== Checking for summary markers:");
    for (let i = 0; i < messagesAfter.length; i++) {
      const msg = messagesAfter[i];
      const metaType = (msg.metadata && typeof msg.metadata === 'object') ? (msg.metadata as any).type : undefined;
      console.log(`  [${i}] role=${msg.role}, content=${msg.content.slice(0,50)}..., metadata.type=${metaType}`);
    }
    
    // Get context
    const context = chatContext.getContext(sessionId);
    console.log("=== Context.hasSummary:", context.hasSummary);
    console.log("=== Context.messages.length:", context.messages.length);
    
    expect(compactResult.compactionResult).toBeDefined();
    expect(context.hasSummary).toBe(true);
  });
});
