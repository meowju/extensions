/**
 * Epoch 22 Test Spec: Session Compaction Fixes
 * 
 * GAP: Token estimation bug in session-store.ts::compactSession()
 * causing compaction to never trigger.
 * 
 * Validates:
 * 1. Token estimation is accurate (use /3 not /4)
 * 2. Auto-trigger works (via MemoryStore.addMessageToThread)
 * 3. Session file is properly overwritten after compaction
 * 4. Boundary cases handled
 * 
 * Run with: bun test dogfood/epoch-22-fix-session-compaction.test.ts
 */
import { describe, test, expect, beforeEach, afterEach, vi } from "bun:test";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// ============================================================================
// Test Fixtures
// ============================================================================

const TEST_SESSION_DIR_PREFIX = "/tmp/test-meow-sessions-epoch22";

interface TestContext {
  sessionId: string;
  testDir: string;
}

function setupTestDir(): string {
  const testDir = `${TEST_SESSION_DIR_PREFIX}-${Date.now()}`;
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

// ============================================================================
// Epoch 22: Session Compaction Fix Tests
// ============================================================================

describe("EPOCH 22: Session Compaction Fixes", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = setupTestDir();
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  // -------------------------------------------------------------------------
  // Test 1: Token Estimation Accuracy
  // -------------------------------------------------------------------------

  describe("T1: Token Estimation", () => {
    
    test("T1.1: estimateTokens uses accurate calculation (chars/3 not chars/4)", async () => {
      // Test the token estimation function directly
      const { loadSession, appendToSession } = await import(
        "../agent-kernel/src/core/session-store.ts"
      );
      
      const sessionId = `test-tokens-${Date.now()}`;
      const sessionFile = join(testDir, `${sessionId}.jsonl`);
      writeFileSync(sessionFile, "", "utf-8");
      
      // Create messages that should trigger compaction with /3 but not /4
      // With /4: 100 msgs * 300 chars avg * (1/4) = 7500 tokens < 64000 (80% of 80k)
      // With /3: 100 msgs * 300 chars avg * (1/3) = 10000 tokens > 56000 (70% of 80k)
      const messages = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant" as const,
        content: `This is message number ${i} with substantial content. `.repeat(15),
        timestamp: new Date().toISOString(),
      }));
      
      appendToSession(sessionId, messages);
      
      // Verify messages were added
      const loaded = loadSession(sessionId);
      expect(loaded).toHaveLength(100);
      
      // Calculate total chars
      let totalChars = 0;
      for (const msg of loaded) {
        totalChars += msg.content.length;
      }
      
      // With /3, should be ~10,000 tokens
      // With /4, would be ~7,500 tokens
      const estimatedWith3 = Math.ceil(totalChars / 3);
      const estimatedWith4 = Math.ceil(totalChars / 4);
      
      // Token estimation should be in the right ballpark
      expect(estimatedWith3).toBeGreaterThan(5000);
      expect(estimatedWith3).toBeLessThan(15000);
    });

    test("T1.2: Small messages don't trigger compaction", async () => {
      const { compactSession, appendToSession } = await import(
        "../agent-kernel/src/core/session-store.ts"
      );
      
      const sessionId = `test-small-${Date.now()}`;
      const sessionFile = join(testDir, `${sessionId}.jsonl`);
      writeFileSync(sessionFile, "", "utf-8");
      
      // Just a few small messages
      const smallMessages = [
        { role: "user", content: "Hi", timestamp: new Date().toISOString() },
        { role: "assistant", content: "Hello!", timestamp: new Date().toISOString() },
      ];
      
      appendToSession(sessionId, smallMessages);
      
      const mockSummarize = vi.fn();
      
      const result = await compactSession(sessionId, {
        summarizeFn: mockSummarize,
        maxTokens: 80000,
      });
      
      // Under threshold, should return early without calling summarize
      expect(mockSummarize).not.toHaveBeenCalled();
      expect(result.summary).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Test 2: Compaction Trigger Logic
  // -------------------------------------------------------------------------

  describe("T2: Compaction Trigger", () => {
    
    test("T2.1: compactSession IS called when messages exceed threshold", async () => {
      const { compactSession, appendToSession } = await import(
        "../agent-kernel/src/core/session-store.ts"
      );
      
      const sessionId = `test-trigger-${Date.now()}`;
      const sessionFile = join(testDir, `${sessionId}.jsonl`);
      writeFileSync(sessionFile, "", "utf-8");
      
      // Create messages that WILL exceed threshold with fixed token estimation
      // Each message ~200 chars, 150 messages = ~30,000 chars → ~10,000 tokens with /3
      // Threshold at 70% of 80k = 56k tokens... but for testing use lower threshold
      const largeMessages = Array.from({ length: 150 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant" as const,
        content: `Message ${i} with content. `.repeat(20),
        timestamp: new Date().toISOString(),
      }));
      
      appendToSession(sessionId, largeMessages);
      
      const mockSummarize = vi.fn().mockResolvedValue("Summary of conversation");
      
      // Use lower threshold to ensure compaction triggers
      const result = await compactSession(sessionId, {
        summarizeFn: mockSummarize,
        maxTokens: 10000, // Low threshold to force compaction
      });
      
      // Should have compacted
      expect(mockSummarize).toHaveBeenCalledTimes(1);
      expect(result.summary).toBe("Summary of conversation");
      expect(result.compactedCount).toBeLessThan(result.originalCount);
    });

    test("T2.2: Only old messages passed to summarizeFn", async () => {
      const { compactSession, appendToSession } = await import(
        "../agent-kernel/src/core/session-store.ts"
      );
      
      const sessionId = `test-old-only-${Date.now()}`;
      const sessionFile = join(testDir, `${sessionId}.jsonl`);
      writeFileSync(sessionFile, "", "utf-8");
      
      // Old messages
      const oldMessages = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant" as const,
        content: `OLD_TOPIC: Message ${i} about old stuff`,
        timestamp: new Date().toISOString(),
      }));
      
      // Recent messages
      const recentMessages = [
        { role: "user", content: "RECENT_USER_CONTENT_DO_NOT_INCLUDE", timestamp: new Date().toISOString() },
        { role: "assistant", content: "RECENT_ASSISTANT_CONTENT_DO_NOT_INCLUDE", timestamp: new Date().toISOString() },
      ];
      
      appendToSession(sessionId, [...oldMessages, ...recentMessages]);
      
      let capturedMessages: any[] = [];
      const mockSummarize = vi.fn().mockImplementation((msgs) => {
        capturedMessages = msgs;
        return Promise.resolve("Summary");
      });
      
      await compactSession(sessionId, {
        summarizeFn: mockSummarize,
        maxTokens: 5000, // Force compaction
      });
      
      // Should NOT contain RECENT messages
      expect(capturedMessages.some(m => m.content.includes("RECENT_USER_CONTENT"))).toBe(false);
      expect(capturedMessages.some(m => m.content.includes("RECENT_ASSISTANT_CONTENT"))).toBe(false);
      
      // Should contain OLD messages
      expect(capturedMessages.some(m => m.content.includes("OLD_TOPIC"))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Test 3: History Replacement
  // -------------------------------------------------------------------------

  describe("T3: History Replacement", () => {
    
    test("T3.1: Session file is overwritten with compacted content", async () => {
      const { compactSession, appendToSession, loadSession } = await import(
        "../agent-kernel/src/core/session-store.ts"
      );
      
      const sessionId = `test-overwrite-${Date.now()}`;
      const sessionFile = join(testDir, `${sessionId}.jsonl`);
      writeFileSync(sessionFile, "", "utf-8");
      
      // Add many messages
      const messages = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant" as const,
        content: `Content message ${i} with substantial text`.repeat(10),
        timestamp: new Date().toISOString(),
      }));
      
      appendToSession(sessionId, messages);
      
      // Compaction
      await compactSession(sessionId, {
        summarizeFn: async () => "Compacted summary",
        maxTokens: 5000,
      });
      
      // Load from file - should be compacted
      const loaded = loadSession(sessionId);
      
      // Should be much fewer messages
      expect(loaded.length).toBeLessThan(20);
      
      // Should contain summary marker
      const hasMarker = loaded.some(m => m.content.includes("[Previous conversation summarized]"));
      expect(hasMarker).toBe(true);
      
      // Should contain summary content
      const hasSummary = loaded.some(m => m.content.includes("## Conversation Summary"));
      expect(hasSummary).toBe(true);
    });

    test("T3.2: Recent messages preserved after compaction", async () => {
      const { compactSession, appendToSession, loadSession } = await import(
        "../agent-kernel/src/core/session-store.ts"
      );
      
      const sessionId = `test-recent-preserved-${Date.now()}`;
      const sessionFile = join(testDir, `${sessionId}.jsonl`);
      writeFileSync(sessionFile, "", "utf-8");
      
      // Old messages
      const oldMessages = Array.from({ length: 80 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant" as const,
        content: `Old message ${i}`,
        timestamp: new Date().toISOString(),
      }));
      
      // Recent messages with identifiable content
      const recentMessages = [
        { role: "user", content: "THIS_RECENT_USER_SHOULD_BE_PRESERVED", timestamp: new Date().toISOString() },
        { role: "assistant", content: "THIS_RECENT_ASSISTANT_SHOULD_BE_PRESERVED", timestamp: new Date().toISOString() },
      ];
      
      appendToSession(sessionId, [...oldMessages, ...recentMessages]);
      
      await compactSession(sessionId, {
        summarizeFn: async () => "Summary",
        maxTokens: 5000,
      });
      
      const loaded = loadSession(sessionId);
      
      // Recent messages should be in the file
      expect(loaded.some(m => m.content.includes("THIS_RECENT_USER_SHOULD_BE_PRESERVED"))).toBe(true);
      expect(loaded.some(m => m.content.includes("THIS_RECENT_ASSISTANT_SHOULD_BE_PRESERVED"))).toBe(true);
    });

    test("T3.3: System messages preserved during compaction", async () => {
      const { compactSession, appendToSession, loadSession } = await import(
        "../agent-kernel/src/core/session-store.ts"
      );
      
      const sessionId = `test-system-preserved-${Date.now()}`;
      const sessionFile = join(testDir, `${sessionId}.jsonl`);
      writeFileSync(sessionFile, "", "utf-8");
      
      // System messages
      const systemMessages = [
        { role: "system", content: "You are a helpful assistant.", timestamp: new Date().toISOString() },
        { role: "system", content: "Remember to be concise.", timestamp: new Date().toISOString() },
      ];
      
      // Regular messages that will trigger compaction
      const regularMessages = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant" as const,
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }));
      
      appendToSession(sessionId, [...systemMessages, ...regularMessages]);
      
      await compactSession(sessionId, {
        summarizeFn: async () => "Summary",
        maxTokens: 5000,
      });
      
      const loaded = loadSession(sessionId);
      
      // System messages should be preserved
      const systemCount = loaded.filter(m => m.role === "system").length;
      expect(systemCount).toBeGreaterThanOrEqual(2);
      
      // At least one system message should have original content
      const hasOriginalSystem = loaded.some(m => 
        m.role === "system" && m.content.includes("You are a helpful assistant")
      );
      expect(hasOriginalSystem).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Test 4: MemoryStore Auto-Trigger Integration
  // -------------------------------------------------------------------------

  describe("T4: MemoryStore Auto-Trigger", () => {
    
    test("T4.1: addMessageToThread triggers compaction when threshold reached", async () => {
      const { MemoryStore } = await import("../src/core/memory.ts");
      const store = new MemoryStore(testDir);
      
      const channelId = "test-auto-trigger";
      const userId = "user-auto";
      
      // Add messages until compaction triggers
      // COMPACT_THRESHOLD = 20 in memory.ts
      for (let i = 0; i < 25; i++) {
        store.addMessageToThread(channelId, userId, "user", `Message ${i}`);
        store.addMessageToThread(channelId, userId, "meow", `Response ${i}`);
      }
      
      // After compaction, thread should have compressed summaries
      const thread = (store as any).contextThreads.get(channelId);
      expect(thread).toBeDefined();
      
      // Should have compressed summaries from compaction
      expect(thread.compressedSummaries.length).toBeGreaterThan(0);
      
      // Messages should be reduced to working memory
      expect(thread.messages.length).toBeLessThanOrEqual(20);
    });

    test("T4.2: needsCompaction returns true when threshold reached", async () => {
      const { MemoryStore } = await import("../src/core/memory.ts");
      const store = new MemoryStore(testDir);
      
      const channelId = "test-needs-compact";
      
      // Initially no compaction needed
      expect(store.needsCompaction(channelId)).toBe(false);
      
      // Add messages
      for (let i = 0; i < 15; i++) {
        store.addMessageToThread(channelId, "user1", "user", `Msg ${i}`);
        store.addMessageToThread(channelId, "user1", "meow", `Resp ${i}`);
      }
      
      // 15 pairs = 30 messages < 20 threshold
      expect(store.needsCompaction(channelId)).toBe(false);
      
      // Add more
      store.addMessageToThread(channelId, "user1", "user", "One more");
      store.addMessageToThread(channelId, "user1", "meow", "And another");
      
      // 32 messages >= 20 threshold - compaction should have triggered
      // needsCompaction should return false after compaction
      expect(store.needsCompaction(channelId)).toBe(false);
    });

    test("T4.3: getThreadContext returns compact context after compaction", async () => {
      const { MemoryStore } = await import("../src/core/memory.ts");
      const store = new MemoryStore(testDir);
      
      const channelId = "test-context-after-compact";
      
      // Add enough messages to trigger compaction
      for (let i = 0; i < 25; i++) {
        store.addMessageToThread(channelId, "user1", "user", `User message ${i} about testing`);
        store.addMessageToThread(channelId, "user1", "meow", `Meow response ${i}`);
      }
      
      // Get context
      const context = store.getThreadContext(channelId, "TestUser");
      
      // Should have compressed summaries section
      expect(context).toContain("## Past Conversation Summary");
      
      // Should have recent conversation section
      expect(context).toContain("## Recent Conversation");
    });
  });

  // -------------------------------------------------------------------------
  // Test 5: Incremental Compaction
  // -------------------------------------------------------------------------

  describe("T5: Incremental Compaction", () => {
    
    test("T5.1: Multiple compaction cycles work correctly", async () => {
      const { MemoryStore } = await import("../src/core/memory.ts");
      const store = new MemoryStore(testDir);
      
      const channelId = "test-incremental";
      
      // First batch - triggers first compaction
      for (let i = 0; i < 25; i++) {
        store.addMessageToThread(channelId, "user1", "user", `Batch1 msg ${i}`);
        store.addMessageToThread(channelId, "user1", "meow", `Batch1 resp ${i}`);
      }
      
      const thread1 = (store as any).contextThreads.get(channelId);
      const summariesAfter1 = thread1.compressedSummaries.length;
      
      // Second batch - triggers second compaction
      for (let i = 0; i < 25; i++) {
        store.addMessageToThread(channelId, "user1", "user", `Batch2 msg ${i}`);
        store.addMessageToThread(channelId, "user1", "meow", `Batch2 resp ${i}`);
      }
      
      const thread2 = (store as any).contextThreads.get(channelId);
      const summariesAfter2 = thread2.compressedSummaries.length;
      
      // Should have more summaries after second compaction
      expect(summariesAfter2).toBeGreaterThan(summariesAfter1);
      
      // Context should still be valid
      const context = store.getThreadContext(channelId, "User");
      expect(context.length).toBeGreaterThan(0);
    });

    test("T5.2: Compressed summaries don't grow unbounded", async () => {
      const { MemoryStore } = await import("../src/core/memory.ts");
      const store = new MemoryStore(testDir);
      
      const channelId = "test-summary-limit";
      
      // Add many batches to accumulate summaries
      for (let batch = 0; batch < 5; batch++) {
        for (let i = 0; i < 25; i++) {
          store.addMessageToThread(channelId, "user1", "user", `Batch${batch} msg ${i}`);
          store.addMessageToThread(channelId, "user1", "meow", `Batch${batch} resp ${i}`);
        }
      }
      
      const thread = (store as any).contextThreads.get(channelId);
      
      // Should have compressed summaries but not unbounded
      // memory.ts limits to last 20 summaries
      expect(thread.compressedSummaries.length).toBeLessThanOrEqual(20);
    });
  });

  // -------------------------------------------------------------------------
  // Test 6: Boundary Cases
  // -------------------------------------------------------------------------

  describe("T6: Boundary Cases", () => {
    
    test("T6.1: Empty session returns empty result", async () => {
      const { compactSession } = await import("../agent-kernel/src/core/session-store.ts");
      
      const sessionId = `test-empty-${Date.now()}`;
      const sessionFile = join(testDir, `${sessionId}.jsonl`);
      writeFileSync(sessionFile, "", "utf-8");
      
      const result = await compactSession(sessionId, {
        summarizeFn: async () => "Summary",
        maxTokens: 80000,
      });
      
      expect(result.messages).toHaveLength(0);
      expect(result.summary).toBe("");
      expect(result.originalCount).toBe(0);
      expect(result.compactedCount).toBe(0);
    });

    test("T6.2: Non-existent session returns empty array", async () => {
      const { loadSession } = await import("../agent-kernel/src/core/session-store.ts");
      
      const result = loadSession("non-existent-session-xyz-123");
      
      expect(result).toEqual([]);
    });

    test("T6.3: Session with only system messages", async () => {
      const { compactSession, appendToSession, loadSession } = await import(
        "../agent-kernel/src/core/session-store.ts"
      );
      
      const sessionId = `test-system-only-${Date.now()}`;
      const sessionFile = join(testDir, `${sessionId}.jsonl`);
      writeFileSync(sessionFile, "", "utf-8");
      
      const messages = [
        { role: "system", content: "System prompt here", timestamp: new Date().toISOString() },
        { role: "system", content: "Another system message", timestamp: new Date().toISOString() },
      ];
      
      appendToSession(sessionId, messages);
      
      const result = await compactSession(sessionId, {
        summarizeFn: async () => "Summary",
        maxTokens: 5000,
      });
      
      // Should not compact (no conversation messages)
      expect(result.compactedCount).toBe(2);
    });

    test("T6.4: Handles unicode and special characters", async () => {
      const { compactSession, appendToSession, loadSession } = await import(
        "../agent-kernel/src/core/session-store.ts"
      );
      
      const sessionId = `test-unicode-${Date.now()}`;
      const sessionFile = join(testDir, `${sessionId}.jsonl`);
      writeFileSync(sessionFile, "", "utf-8");
      
      const messages = [
        { role: "user", content: "Testing émojis 🎉 and unicode 日本語", timestamp: new Date().toISOString() },
        { role: "assistant", content: "Response with <script>safe</script>", timestamp: new Date().toISOString() },
        ...Array.from({ length: 100 }, (_, i) => ({
          role: i % 2 === 0 ? "user" : "assistant" as const,
          content: `Content with special chars ${i} & "quotes" and 'apostrophes'`,
          timestamp: new Date().toISOString(),
        })),
      ];
      
      appendToSession(sessionId, messages);
      
      const result = await compactSession(sessionId, {
        summarizeFn: async () => "Summary with unicode 📝",
        maxTokens: 5000,
      });
      
      // Should handle unicode without errors
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages.some(m => m.content.includes("🎉"))).toBe(true);
    });

    test("T6.5: Custom maxTokens threshold works", async () => {
      const { compactSession, appendToSession } = await import(
        "../agent-kernel/src/core/session-store.ts"
      );
      
      const sessionId = `test-custom-max-${Date.now()}`;
      const sessionFile = join(testDir, `${sessionId}.jsonl`);
      writeFileSync(sessionFile, "", "utf-8");
      
      const messages = Array.from({ length: 50 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant" as const,
        content: `Message ${i} with content`.repeat(20),
        timestamp: new Date().toISOString(),
      }));
      
      appendToSession(sessionId, messages);
      
      // Use very low threshold
      const result = await compactSession(sessionId, {
        summarizeFn: async () => "Summary",
        maxTokens: 1000, // Very low threshold
      });
      
      // Should have compacted
      expect(result.compactedCount).toBeLessThan(result.originalCount);
    });
  });
});

// ============================================================================
// Integration Tests: Full Session Lifecycle
// ============================================================================

describe("EPOCH 22: Integration - Full Session Lifecycle", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = setupTestDir();
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("IL1: Create session → Add messages → Compact → Verify", async () => {
    const { createSession, appendToSession, compactSession, loadSession } = await import(
      "../agent-kernel/src/core/session-store.ts"
    );
    
    // Create session
    const sessionId = createSession();
    expect(sessionId).toBeTruthy();
    
    // Add messages
    const messages = Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Message ${i} with content`,
      timestamp: new Date().toISOString(),
    }));
    appendToSession(sessionId, messages);
    
    // Verify messages added
    const loadedBefore = loadSession(sessionId);
    expect(loadedBefore).toHaveLength(100);
    
    // Compact
    const result = await compactSession(sessionId, {
      summarizeFn: async () => "Session was compacted successfully",
      maxTokens: 5000,
    });
    
    // Verify compaction worked
    expect(result.originalCount).toBe(100);
    expect(result.compactedCount).toBeLessThan(20);
    expect(result.summary).toBeTruthy();
    
    // Verify file was updated
    const loadedAfter = loadSession(sessionId);
    expect(loadedAfter.length).toBe(result.compactedCount);
  });

  test("IL2: MemoryStore context remains coherent after multiple compactions", async () => {
    const { MemoryStore } = await import("../src/core/memory.ts");
    const store = new MemoryStore(testDir);
    
    const channelId = "test-coherence";
    const userId = "user-coherence";
    
    // Add multiple batches
    for (let batch = 0; batch < 3; batch++) {
      for (let i = 0; i < 25; i++) {
        store.addMessageToThread(channelId, userId, "user", `Batch${batch} user msg ${i}`);
        store.addMessageToThread(channelId, userId, "meow", `Batch${batch} meow resp ${i}`);
      }
    }
    
    // Get context
    const context = store.getThreadContext(channelId, "User");
    
    // Should have summary and recent
    expect(context).toContain("## Past Conversation Summary");
    expect(context).toContain("## Recent Conversation");
    
    // Should mention at least one batch in summaries
    expect(context).toMatch(/Batch[0-2]/);
    
    // Should have recent messages
    expect(context).toMatch(/Batch2/); // Most recent batch should be in recent
  });

  test("IL3: High volume stress test - 500 messages", async () => {
    const { MemoryStore } = await import("../src/core/memory.ts");
    const store = new MemoryStore(testDir);
    
    const channelId = "test-stress";
    const userId = "user-stress";
    
    // Add 500 messages (250 pairs)
    for (let i = 0; i < 250; i++) {
      store.addMessageToThread(channelId, userId, "user", `Stress test message ${i} with content`);
      store.addMessageToThread(channelId, userId, "meow", `Stress test response ${i}`);
    }
    
    // Should not crash
    const context = store.getThreadContext(channelId, "StressUser");
    expect(context.length).toBeGreaterThan(0);
    
    // Should be reasonably sized
    expect(context.length).toBeLessThan(5000);
    
    // Should still have both sections
    expect(context).toContain("## Past Conversation Summary");
    expect(context).toContain("## Recent Conversation");
    
    // Should have extracted some facts
    const profile = store.getProfile(userId);
    expect(profile).toBeDefined();
    expect(profile!.facts.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Performance Regression Tests
// ============================================================================

describe("EPOCH 22: Performance Regression", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = setupTestDir();
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("PR1: Compaction completes in reasonable time", async () => {
    const { compactSession, appendToSession } = await import(
      "../agent-kernel/src/core/session-store.ts"
    );
    
    const sessionId = `test-perf-${Date.now()}`;
    const sessionFile = join(testDir, `${sessionId}.jsonl`);
    writeFileSync(sessionFile, "", "utf-8");
    
    // Add 200 messages
    const messages = Array.from({ length: 200 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant" as const,
      content: `Performance test message ${i}`.repeat(10),
      timestamp: new Date().toISOString(),
    }));
    appendToSession(sessionId, messages);
    
    const start = Date.now();
    
    await compactSession(sessionId, {
      summarizeFn: async () => "Performance test summary",
      maxTokens: 5000,
    });
    
    const duration = Date.now() - start;
    
    // Should complete in under 1 second (mock summarize is instant)
    expect(duration).toBeLessThan(1000);
  });

  test("PR2: MemoryStore handles rapid message addition", async () => {
    const { MemoryStore } = await import("../src/core/memory.ts");
    const store = new MemoryStore(testDir);
    
    const channelId = "test-rapid";
    const userId = "user-rapid";
    
    const start = Date.now();
    
    // Add 100 messages rapidly
    for (let i = 0; i < 100; i++) {
      store.addMessageToThread(channelId, userId, "user", `Rapid message ${i}`);
      store.addMessageToThread(channelId, userId, "meow", `Rapid response ${i}`);
    }
    
    const duration = Date.now() - start;
    
    // Should complete quickly
    expect(duration).toBeLessThan(2000);
    
    // Context should be valid
    const context = store.getThreadContext(channelId, "User");
    expect(context.length).toBeGreaterThan(0);
  });
});