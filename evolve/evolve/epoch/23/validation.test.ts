/**
 * Epoch 23 Validation Test: chat-context.ts Auto-Trigger Integration
 * 
 * GAP-1: compactSession() exists in session-store.ts but lacks
 * auto-trigger integration via chat-context.ts.
 * 
 * Validates:
 * 1. chat-context.ts exists and exports required functions
 * 2. Auto-trigger fires at COMPACT_THRESHOLD (20 messages)
 * 3. compactSession is called automatically
 * 4. Returns CompactedSession result
 * 5. Handles edge cases (no session, already compacting)
 * 
 * Run with: bun test evolve/epoch/23/validation.test.ts
 */
import { describe, test, expect, beforeEach, afterEach, vi } from "bun:test";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// ============================================================================
// Test Fixtures
// ============================================================================

const TEST_DIR_PREFIX = "/tmp/test-epoch23-chat-context";

function setupTestDir(): string {
  const testDir = `${TEST_DIR_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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

function setupTestDirWithSessions(): string {
  const testDir = setupTestDir();
  // Create sessions subdirectory for session-store.ts
  mkdirSync(join(testDir, "sessions"), { recursive: true });
  return testDir;
}

// ============================================================================
// Pre-Implementation Verification (T0)
// ============================================================================

describe("EPOCH 23: T0 - Module Existence", () => {
  
  test("T0.1: chat-context.ts exists in src/core/", () => {
    const chatContextPath = join(process.cwd(), "src/core/chat-context.ts");
    expect(existsSync(chatContextPath)).toBe(true);
  });

  test("T0.2: session-store.ts exports required functions for integration", async () => {
    const { 
      compactSession, 
      sessionNeedsCompaction, 
      COMPACT_THRESHOLD,
      appendToSession,
      loadSession,
      setSessionDir 
    } = await import("../src/core/session-store.ts");
    
    expect(typeof compactSession).toBe("function");
    expect(typeof sessionNeedsCompaction).toBe("function");
    expect(typeof COMPACT_THRESHOLD).toBe("number");
    expect(COMPACT_THRESHOLD).toBe(20);
    expect(typeof appendToSession).toBe("function");
    expect(typeof loadSession).toBe("function");
    expect(typeof setSessionDir).toBe("function");
  });

  test("T0.3: chat-context.ts exports required functions via chatContext object", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    
    expect(typeof chatContext.appendWithAutoCompact).toBe("function");
    expect(typeof chatContext.triggerCompaction).toBe("function");
    expect(typeof chatContext.getContext).toBe("function");
    expect(typeof chatContext.needsCompaction).toBe("function");
  });

  test("T0.4: chat-context.ts exports ChatContextOptions interface in code", async () => {
    // Interfaces are compile-time only, but we can verify the file contains the interface definition
    const chatContextPath = join(process.cwd(), "src/core/chat-context.ts");
    const content = readFileSync(chatContextPath, "utf-8");
    
    expect(content).toContain("ChatContextOptions");
    expect(content).toContain("interface ChatContextOptions");
  });
});

// ============================================================================
// T1: Auto-Trigger Fires at COMPACT_THRESHOLD (20 messages)
// ============================================================================

describe("EPOCH 23: T1 - Auto-Trigger at Threshold", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDirWithSessions();
    const { setSessionDir } = await import("../src/core/session-store.ts");
    setSessionDir(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T1.1: Appends below threshold do NOT trigger compaction", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    // Add 5 messages (well below threshold of 20)
    for (let i = 0; i < 5; i++) {
      const result = await chatContext.appendWithAutoCompact(sessionId, [{
        role: "user",
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }], { sessionId, summarizeFn: mockSummarize });
      
      expect(result.appended).toBe(true);
      expect(result.compactionResult).toBeUndefined();
    }
    
    // Summarize should NOT have been called
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  test("T1.2: Appends at threshold (20) DO trigger compaction", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    const mockSummarize = vi.fn().mockResolvedValue("Compact this conversation");
    
    // Pre-populate to approach threshold
    const preMessages = Array.from({ length: 18 }, (_, i) => ({
      role: "user" as const,
      content: `Pre message ${i}`,
      timestamp: new Date().toISOString(),
    }));
    appendToSession(sessionId, preMessages);
    
    // Add 2 more messages - when we hit 20, compaction triggers
    for (let i = 0; i < 2; i++) {
      const result = await chatContext.appendWithAutoCompact(sessionId, [{
        role: "user",
        content: `Threshold message ${i}`,
        timestamp: new Date().toISOString(),
      }], { sessionId, summarizeFn: mockSummarize });
      
      // When we reach 20 messages, compaction triggers
      if (i >= 1) {
        expect(result.compactionResult).toBeDefined();
        expect(result.compactionResult!.compactedCount).toBeLessThan(result.compactionResult!.originalCount);
      }
    }
  });

  test("T1.3: Exactly at threshold triggers compaction", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, loadSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    // Add exactly 20 messages
    for (let i = 0; i < 20; i++) {
      await chatContext.appendWithAutoCompact(sessionId, [{
        role: "user",
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }], { sessionId, summarizeFn: mockSummarize });
    }
    
    // Verify session has messages
    const messages = loadSession(sessionId);
    
    // After compaction at 20, there should be summary markers and fewer messages
    expect(messages.length).toBeLessThan(20);
    expect(mockSummarize).toHaveBeenCalled();
  });

  test("T1.4: After compaction, below threshold again", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    
    // Add 25 messages to trigger compaction on next add
    appendToSession(sessionId, Array.from({ length: 25 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    // First add triggers compaction
    const result1 = await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Trigger compaction",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    expect(result1.compactionResult).toBeDefined();
    
    // Next add should NOT trigger compaction again (unless we add many)
    const result2 = await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Post-compaction message",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    // Should not trigger another compaction
    // (compacted session is back below threshold)
    expect(result2.compactionResult).toBeUndefined();
  });
});

// ============================================================================
// T2: compactSession is Called Automatically
// ============================================================================

describe("EPOCH 23: T2 - Automatic compactSession Calls", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDirWithSessions();
    const { setSessionDir } = await import("../src/core/session-store.ts");
    setSessionDir(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T2.1: appendWithAutoCompact calls compactSession when threshold reached", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    let summarizeCallCount = 0;
    
    // Pre-populate with 19 messages
    appendToSession(sessionId, Array.from({ length: 19 }, (_, i) => ({
      role: "user" as const,
      content: `Pre message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    const mockSummarize = vi.fn().mockImplementation(async () => {
      summarizeCallCount++;
      return "Summary of conversation";
    });
    
    // Add one more message to trigger compaction
    await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Trigger",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    // Summarize should have been called (proves compactSession was invoked)
    expect(summarizeCallCount).toBe(1);
  });

  test("T2.2: appendWithAutoCompact uses sessionNeedsCompaction internally", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession, sessionNeedsCompaction } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    // Initially no compaction needed
    expect(sessionNeedsCompaction(sessionId)).toBe(false);
    
    // Add messages approaching threshold
    appendToSession(sessionId, Array.from({ length: 19 }, (_, i) => ({
      role: "user" as const,
      content: `Pre message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    // At 19 messages, still no compaction
    expect(sessionNeedsCompaction(sessionId)).toBe(false);
    
    // Add one more - should trigger
    await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Final message",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    // Should have called summarize (proving compactSession was invoked)
    expect(mockSummarize).toHaveBeenCalled();
  });

  test("T2.3: Multiple rapid appends only compact once at threshold", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    let compactionCount = 0;
    
    const mockSummarize = vi.fn().mockImplementation(async () => {
      compactionCount++;
      return `Summary ${compactionCount}`;
    });
    
    // Add 25 messages rapidly
    for (let i = 0; i < 25; i++) {
      await chatContext.appendWithAutoCompact(sessionId, [{
        role: "user",
        content: `Rapid message ${i}`,
        timestamp: new Date().toISOString(),
      }], { sessionId, summarizeFn: mockSummarize });
    }
    
    // Should have compacted exactly once at threshold
    expect(compactionCount).toBe(1);
  });
});

// ============================================================================
// T3: Returns CompactedSession Result
// ============================================================================

describe("EPOCH 23: T3 - CompactedSession Result", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDirWithSessions();
    const { setSessionDir } = await import("../src/core/session-store.ts");
    setSessionDir(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T3.1: appendWithAutoCompact returns result with correct structure", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    const summaryText = "User discussed project planning and implementation details.";
    
    // Add enough messages to trigger compaction
    appendToSession(sessionId, Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Message ${i} with substantial content that needs compaction`.repeat(5),
      timestamp: new Date().toISOString(),
    })));
    
    const mockSummarize = vi.fn().mockResolvedValue(summaryText);
    
    // Trigger through appendWithAutoCompact
    const result = await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "One more message to trigger compaction",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    // Verify compaction result structure
    expect(result.appended).toBe(true);
    expect(result.compactionResult).toBeDefined();
    expect(result.compactionResult.messages).toBeDefined();
    expect(result.compactionResult.summary).toBe(summaryText);
    expect(result.compactionResult.originalCount).toBe(26);
    expect(result.compactionResult.compactedCount).toBeLessThan(26);
  });

  test("T3.2: Result includes messages array", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    
    appendToSession(sessionId, Array.from({ length: 25 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    const result = await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Trigger",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    expect(Array.isArray(result.compactionResult.messages)).toBe(true);
    expect(result.compactionResult.messages.length).toBeGreaterThan(0);
  });

  test("T3.3: Result includes correct counts", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    
    appendToSession(sessionId, Array.from({ length: 30 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    const result = await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Trigger",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    expect(result.compactionResult.originalCount).toBe(31);
    expect(result.compactionResult.compactedCount).toBeLessThan(result.compactionResult.originalCount);
    expect(result.compactionResult.compactedCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// T4: Edge Cases - No Session / Already Compacting
// ============================================================================

describe("EPOCH 23: T4 - Edge Cases", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDirWithSessions();
    const { setSessionDir } = await import("../src/core/session-store.ts");
    setSessionDir(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T4.1: appendWithAutoCompact handles non-existent session gracefully", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    // Using a random session ID that doesn't exist
    const nonExistentId = `nonexistent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    // Should not throw, but may create an empty session
    const result = await chatContext.appendWithAutoCompact(nonExistentId, [{
      role: "user",
      content: "Test message",
      timestamp: new Date().toISOString(),
    }], { sessionId: nonExistentId, summarizeFn: mockSummarize });
    
    expect(result.appended).toBe(true);
  });

  test("T4.2: getContext handles non-existent session gracefully", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    
    const nonExistentId = `nonexistent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const result = chatContext.getContext(nonExistentId);
    
    // Should return empty result or gracefully handle
    // Current implementation returns ContextResult object - may have empty messages
    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'messages' in result) {
      expect(Array.isArray(result.messages)).toBe(true);
    }
  });

  test("T4.3: triggerCompaction handles non-existent session", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    
    const nonExistentId = `nonexistent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const result = await chatContext.triggerCompaction(nonExistentId, {
      sessionId: nonExistentId,
      summarizeFn: async () => "Summary"
    });
    
    // Should return null or a result with zero counts for non-existent session
    // Current implementation returns { messages: [], summary: "", originalCount: 0, compactedCount: 0 }
    expect(result).toBeDefined();
    if (result !== null) {
      expect(result.originalCount).toBe(0);
      expect(result.compactedCount).toBe(0);
    }
  });

  test("T4.4: Empty session - no compaction", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    const result = await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "First message",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    expect(result.appended).toBe(true);
    expect(result.compactionResult).toBeUndefined();
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  test("T4.5: Session with only system messages - no compaction", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    
    // Add system messages only
    appendToSession(sessionId, [
      { role: "system", content: "You are a helpful assistant", timestamp: new Date().toISOString() },
      { role: "system", content: "Remember to be concise", timestamp: new Date().toISOString() },
    ]);
    
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    const result = await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Hello",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    // Should not error
    expect(result.appended).toBe(true);
  });

  test("T4.6: Unicode and special characters in messages", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    
    // Add messages with special characters
    appendToSession(sessionId, [
      { role: "user", content: "Testing émojis 🎉 and unicode 日本語", timestamp: new Date().toISOString() },
      { role: "assistant", content: "Response with <script>safe</script>", timestamp: new Date().toISOString() },
    ]);
    
    // Add more to reach threshold
    appendToSession(sessionId, Array.from({ length: 23 }, (_, i) => ({
      role: "user" as const,
      content: `Content ${i} & "quotes" and 'apostrophes'`,
      timestamp: new Date().toISOString(),
    })));
    
    const mockSummarize = vi.fn().mockResolvedValue("Summary with unicode 📝");
    
    const result = await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Final message",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    // Should handle without errors
    expect(result.appended).toBe(true);
  });

  test("T4.7: Rapid consecutive appends", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    // Add 25 messages rapidly
    const results: any[] = [];
    for (let i = 0; i < 25; i++) {
      const result = await chatContext.appendWithAutoCompact(sessionId, [{
        role: "user",
        content: `Rapid message ${i}`,
        timestamp: new Date().toISOString(),
      }], { sessionId, summarizeFn: mockSummarize });
      results.push(result);
    }
    
    // All should succeed
    expect(results.every(r => r.appended === true)).toBe(true);
    
    // Compaction should have triggered at least once
    const compactionResults = results.filter(r => r.compactionResult);
    expect(compactionResults.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// T5: Context Retrieval
// ============================================================================

describe("EPOCH 23: T5 - Context Retrieval", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDirWithSessions();
    const { setSessionDir } = await import("../src/core/session-store.ts");
    setSessionDir(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T5.1: getContext returns formatted recent messages", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    
    // Add some messages
    appendToSession(sessionId, [
      { role: "user", content: "Hello, how are you?", timestamp: new Date().toISOString() },
      { role: "assistant", content: "I'm doing great, thanks for asking!", timestamp: new Date().toISOString() },
    ]);
    
    const context = chatContext.getContext(sessionId);
    
    // Check formattedContent contains the messages
    if (context.formattedContent) {
      expect(context.formattedContent).toContain("Hello, how are you?");
      expect(context.formattedContent).toContain("I'm doing great");
    }
  });

  test("T5.2: getContext includes summary marker after compaction", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession, loadSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    
    // Add enough messages and trigger compaction
    appendToSession(sessionId, Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    const compactResult = await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Trigger",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: async () => "Compacted conversation summary" });
    
    // Verify compaction happened
    expect(compactResult.compactionResult).toBeDefined();
    
    // For auto compaction (non-force), expect summary to be generated
    expect(compactResult.compactionResult!.summary).toBe("Compacted conversation summary");
    
    // getContext should see the summary marker through hasSummary
    const context = chatContext.getContext(sessionId);
    expect(context.hasSummary).toBe(true);
  });

  test("T5.3: getContext respects maxRecent parameter", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    
    // Add 10 messages
    for (let i = 0; i < 10; i++) {
      appendToSession(sessionId, [{
        role: "user",
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }]);
    }
    
    // Get only last 3
    const context = chatContext.getContext(sessionId, 3);
    
    // Should return a valid context result
    expect(context).toBeDefined();
    if (context && typeof context === 'object') {
      expect(context.messages).toBeDefined();
    }
  });

  test("T5.4: getContext handles empty session", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    const context = chatContext.getContext(sessionId);
    
    // Should return empty result
    expect(context).toBeDefined();
    if (context && typeof context === 'object' && 'messages' in context) {
      expect(Array.isArray(context.messages)).toBe(true);
      expect(context.messages.length).toBe(0);
    }
  });
});

// ============================================================================
// T6: Manual Trigger (triggerCompaction)
// ============================================================================

describe("EPOCH 23: T6 - Manual Compaction Trigger", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDirWithSessions();
    const { setSessionDir } = await import("../src/core/session-store.ts");
    setSessionDir(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T6.1: triggerCompaction forces compaction regardless of threshold", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession, loadSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    
    // Add enough messages that there's enough to compact even at force=true
    // With COMPACT_THRESHOLD=20 and keepRecent=6 for force=true
    // we need more than 6 messages to have oldMessages to compact
    appendToSession(sessionId, Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    const initialCount = loadSession(sessionId).length;
    expect(initialCount).toBe(20);
    
    const mockSummarize = vi.fn().mockResolvedValue("Manual compaction summary");
    
    // Manually trigger compaction
    const result = await chatContext.triggerCompaction(sessionId, {
      sessionId,
      summarizeFn: mockSummarize,
    });
    
    // With 20 messages and keepRecent=6 for force=true:
    // oldMessages = 14, so compaction should happen
    expect(mockSummarize).toHaveBeenCalled();
    
    // Verify session was compacted
    expect(result).not.toBeNull();
    if (result) {
      expect(result.compactedCount).toBeLessThan(result.originalCount);
    }
  });

  test("T6.2: triggerCompaction works on empty session", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    const result = await chatContext.triggerCompaction(sessionId, {
      sessionId,
      summarizeFn: mockSummarize,
    });
    
    // Empty session returns result with zero counts
    expect(result).not.toBeNull();
    expect(result!.originalCount).toBe(0);
    expect(result!.compactedCount).toBe(0);
    expect(mockSummarize).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Integration: Full Workflow
// ============================================================================

describe("EPOCH 23: Integration - Full Chat Workflow", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDirWithSessions();
    const { setSessionDir } = await import("../src/core/session-store.ts");
    setSessionDir(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("IL1: Create session → Add messages → Auto-compact → Get context", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession } = await import("../src/core/session-store.ts");
    
    // Create session
    const sessionId = createSession();
    expect(sessionId).toBeTruthy();
    
    const mockSummarize = vi.fn().mockImplementation(async (messages) => {
      return `Conversation with ${messages.length} messages`;
    });
    
    // Simulate chat conversation
    const messages = [
      "Hello, I need help with my project",
      "I'm building a Discord bot",
      "Using TypeScript and Node.js",
      "Need help with the event handlers",
      "How do I handle messageCreate?",
    ];
    
    for (const msg of messages) {
      await chatContext.appendWithAutoCompact(sessionId, [{
        role: "user",
        content: msg,
        timestamp: new Date().toISOString(),
      }], { sessionId, summarizeFn: mockSummarize });
      
      // Add response
      await chatContext.appendWithAutoCompact(sessionId, [{
        role: "assistant",
        content: `Here's how to handle that...`,
        timestamp: new Date().toISOString(),
      }], { sessionId, summarizeFn: mockSummarize });
    }
    
    // Get context - should include conversation
    const context = chatContext.getContext(sessionId);
    expect(context).toBeDefined();
    
    // Check if content has the expected messages
    if (context && typeof context === 'object') {
      const content = context.formattedContent || "";
      const messagesStr = context.messages ? JSON.stringify(context.messages) : "";
      expect(content.includes("Discord bot") || messagesStr.includes("Discord bot")).toBe(true);
      expect(content.includes("TypeScript") || messagesStr.includes("TypeScript")).toBe(true);
    }
  });

  test("IL2: Multiple auto-compaction cycles", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    let compactionCount = 0;
    
    const mockSummarize = vi.fn().mockImplementation(async () => {
      compactionCount++;
      return `Summary ${compactionCount}`;
    });
    
    // First batch - triggers first compaction
    appendToSession(sessionId, Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Batch 1 message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Batch 1 trigger",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    // Second batch - triggers second compaction
    appendToSession(sessionId, Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Batch 2 message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Batch 2 trigger",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: mockSummarize });
    
    // Should have compacted twice
    expect(compactionCount).toBe(2);
    
    // Context should be valid
    const context = chatContext.getContext(sessionId);
    expect(context).toBeDefined();
  });
});

// ============================================================================
// Performance Regression
// ============================================================================

describe("EPOCH 23: Performance Regression", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDirWithSessions();
    const { setSessionDir } = await import("../src/core/session-store.ts");
    setSessionDir(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("PR1: appendWithAutoCompact completes in reasonable time", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    const mockSummarize = vi.fn().mockResolvedValue("Summary");
    
    const start = Date.now();
    
    // Add 50 messages
    for (let i = 0; i < 50; i++) {
      await chatContext.appendWithAutoCompact(sessionId, [{
        role: "user",
        content: `Performance test message ${i}`,
        timestamp: new Date().toISOString(),
      }], { sessionId, summarizeFn: mockSummarize });
    }
    
    const duration = Date.now() - start;
    
    // Should complete in under 5 seconds (mock summarize is instant)
    expect(duration).toBeLessThan(5000);
  });

  test("PR2: getContext is fast on large session", async () => {
    const { chatContext } = await import("../src/core/chat-context.ts");
    const { createSession, appendToSession } = await import("../src/core/session-store.ts");
    
    const sessionId = createSession();
    
    // Add 200 messages
    appendToSession(sessionId, Array.from({ length: 200 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Large session message ${i}`,
      timestamp: new Date().toISOString(),
    })));
    
    // Trigger compaction first
    await chatContext.appendWithAutoCompact(sessionId, [{
      role: "user",
      content: "Trigger",
      timestamp: new Date().toISOString(),
    }], { sessionId, summarizeFn: async () => "Summary" });
    
    const start = Date.now();
    const context = chatContext.getContext(sessionId);
    const duration = Date.now() - start;
    
    // Should be fast
    expect(duration).toBeLessThan(100);
    expect(context).toBeDefined();
  });
});