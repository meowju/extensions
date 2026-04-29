import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

describe("Debug T4.4 in isolation", () => {
  const TEST_DIR = `/tmp/test-t44-iso-${Date.now()}`;
  
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });
  
  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });
  
  test("T4.4: triggerCompaction handles non-existent session", async () => {
    // Import inside test to get fresh module with setSessionDir
    const { setSessionDir } = await import("../../src/core/session-store.ts");
    setSessionDir(TEST_DIR);
    
    const { chatContext } = await import("../../src/core/chat-context.ts");
    
    const nonExistentId = "definitely-nonexistent-session-12345";
    const file = join(TEST_DIR, `${nonExistentId}.jsonl`);
    
    console.log("Test dir:", TEST_DIR);
    console.log("File:", file);
    console.log("File exists:", existsSync(file));
    
    const result = await chatContext.triggerCompaction(nonExistentId, {
      summarizeFn: async () => "Summary"
    });
    
    console.log("Result:", result);
    
    // Should return null for truly non-existent sessions
    expect(result).toBeNull();
  });
});
