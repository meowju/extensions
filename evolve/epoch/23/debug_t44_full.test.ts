import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR_PREFIX = "/tmp/test-t44-debug";

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
  } catch { /* ignore */ }
}

describe("Debug T4.4 with detailed logging", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T4.4: triggerCompaction handles non-existent session", async () => {
    // Import session-store first
    const ss = await import("../src/core/session-store.ts");
    console.log("session-store exports:", Object.keys(ss));
    
    // Set session dir
    ss.setSessionDir(testDir);
    console.log("Test dir set to:", testDir);
    console.log("getSessionDir() returns:", ss.getSessionDir?.());
    
    // Now import chat-context
    const cc = await import("../src/core/chat-context.ts");
    console.log("chat-context exports:", Object.keys(cc));
    
    // Use a truly non-existent session ID
    const nonExistentId = `definitely-nonexistent-session-${Date.now()}`;
    
    // Manually check if file exists in test dir
    const file = join(testDir, `${nonExistentId}.jsonl`);
    console.log("Expected file path:", file);
    console.log("File exists before call:", existsSync(file));
    console.log("Directory contents:", readdirSync(testDir));
    
    const result = await cc.chatContext.triggerCompaction(nonExistentId, {
      summarizeFn: async () => "Summary"
    });
    
    console.log("Result received:", JSON.stringify(result, null, 2));
    
    expect(result).toBeNull();
  });
});
