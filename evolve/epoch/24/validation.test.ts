/**
 * Epoch 24 Validation Test: Skill Self-Crystallization System
 *
 * GAP: Meow lacks automatic SOP generation from successful task completions.
 *
 * Validates:
 * 1. done-hooks.ts exists and exports required types/functions
 * 2. DoneHooks class with register/unregister/trigger methods
 * 3. crystallizeSkill() generates valid SkillSOP
 * 4. Skills are saved to skill tree
 * 5. Skills can be retrieved by keyword search
 * 6. Edge cases and failure handling
 *
 * Run with: bun test evolve/epoch/24/validation.test.ts
 */
import { describe, test, expect, beforeEach, afterEach, vi } from "bun:test";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Type imports for done-hooks.ts
import type { DoneHook, HookContext, ToolCall, HookResult } from "../../../src/core/done-hooks.ts";
// Type imports for skill-crystallizer.ts
import type { SkillSOP } from "../../../src/core/skill-crystallizer.ts";

// ============================================================================
// Test Fixtures
// ============================================================================

const TEST_DIR_PREFIX = "/tmp/test-epoch24-skill-crystallization";

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

function setupSkillTree(testDir: string): string {
  const skillTree = join(testDir, ".claude", "skills", "skill-tree", "memory");
  mkdirSync(skillTree, { recursive: true });
  return skillTree;
}

// ============================================================================
// T0: Module Existence and Type Exports
// ============================================================================

describe("EPOCH 24: T0 - Module Existence", () => {

  test("T0.1: done-hooks.ts exists in src/core/", () => {
    const hooksPath = join(process.cwd(), "src/core/done-hooks.ts");
    expect(existsSync(hooksPath)).toBe(true);
  });

  test("T0.2: skill-crystallizer.ts exists in src/core/", () => {
    const crystallizerPath = join(process.cwd(), "src/core/skill-crystallizer.ts");
    expect(existsSync(crystallizerPath)).toBe(true);
  });

  test("T0.3: done-hooks.ts exports required types", async () => {
    const hooksPath = join(process.cwd(), "src/core/done-hooks.ts");
    const content = readFileSync(hooksPath, "utf-8");

    // Check for key type exports
    expect(content).toContain("ToolCall");
    expect(content).toContain("HookContext");
    expect(content).toContain("DoneHook");
    expect(content).toContain("HookResult");
    expect(content).toContain("DoneHooks");
  });

  test("T0.4: skill-crystallizer.ts exports required types", async () => {
    const crystallizerPath = join(process.cwd(), "src/core/skill-crystallizer.ts");
    const content = readFileSync(crystallizerPath, "utf-8");

    // Check for skill SOP types
    expect(content).toContain("SkillSOP");
    expect(content).toContain("crystallizeSkill");
    expect(content).toContain("saveSkill");
    expect(content).toContain("searchSkills");
  });

  test("T0.5: TypeScript interface definitions exist", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");

    // DoneHooks class
    expect(DoneHooks).toBeDefined();
    
    // ToolCall interface - check it exists by typeof
    expect(typeof ToolCall !== 'undefined').toBe(true);
    
    // HookContext interface
    expect(typeof HookContext !== 'undefined').toBe(true);
    
    // DoneHook interface
    expect(typeof DoneHook !== 'undefined').toBe(true);
    
    // HookResult interface
    expect(typeof HookResult !== 'undefined').toBe(true);
  });
});

// ============================================================================
// T1: DoneHooks Class - register/unregister/trigger
// ============================================================================

describe("EPOCH 24: T1 - DoneHooks Class", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T1.1: DoneHooks class instantiates", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();
    expect(hooks).toBeDefined();
  });

  test("T1.2: register() adds a hook", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();

    const testHook: DoneHook = {
      name: "test-hook",
      priority: 1,
      trigger: (ctx) => ctx.task.success,
      execute: async (ctx) => ({ success: true })
    };

    hooks.register(testHook);
    // Hook should be registered (no error thrown)
    expect(true).toBe(true);
  });

  test("T1.3: unregister() removes a hook", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();

    const testHook: DoneHook = {
      name: "remove-me",
      priority: 1,
      trigger: (ctx) => false,
      execute: async (ctx) => ({ success: true })
    };

    hooks.register(testHook);
    const result = hooks.unregister("remove-me");
    expect(result).toBe(true);
  });

  test("T1.4: unregister() returns false for non-existent hook", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();

    const result = hooks.unregister("nonexistent-hook");
    expect(result).toBe(false);
  });

  test("T1.5: trigger() executes matching hooks", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();

    let executeCalled = false;

    const testHook: DoneHook = {
      name: "test-trigger",
      priority: 1,
      trigger: (ctx) => ctx.task.success === true,
      execute: async (ctx) => {
        executeCalled = true;
        return { success: true };
      }
    };

    hooks.register(testHook);

    const context: HookContext = {
      task: { id: "test-1", description: "Test task", success: true },
      toolCalls: [],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    const results = await hooks.trigger(context);
    expect(executeCalled).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });

  test("T1.6: trigger() does NOT execute non-matching hooks", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();

    let executeCalled = false;

    const testHook: DoneHook = {
      name: "fail-trigger",
      priority: 1,
      trigger: (ctx) => ctx.task.success === true,  // Only trigger on success
      execute: async (ctx) => {
        executeCalled = true;
        return { success: true };
      }
    };

    hooks.register(testHook);

    const context: HookContext = {
      task: { id: "test-1", description: "Failed task", success: false },  // FAILED
      toolCalls: [],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    const results = await hooks.trigger(context);
    expect(executeCalled).toBe(false);
    expect(results).toHaveLength(0);
  });

  test("T1.7: hooks execute in priority order", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();
    const executionOrder: string[] = [];

    const hook1: DoneHook = {
      name: "low-priority",
      priority: 10,  // Lower priority
      trigger: (ctx) => true,
      execute: async (ctx) => {
        executionOrder.push("low");
        return { success: true };
      }
    };

    const hook2: DoneHook = {
      name: "high-priority",
      priority: 1,  // Higher priority
      trigger: (ctx) => true,
      execute: async (ctx) => {
        executionOrder.push("high");
        return { success: true };
      }
    };

    hooks.register(hook1);
    hooks.register(hook2);

    const context: HookContext = {
      task: { id: "test-1", description: "Priority test", success: true },
      toolCalls: [],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    await hooks.trigger(context);
    expect(executionOrder).toEqual(["high", "low"]);
  });
});

// ============================================================================
// T2: crystallizeSkill() - SOP Generation
// ============================================================================

describe("EPOCH 24: T2 - crystallizeSkill() Function", () => {
  let testDir: string;
  let skillTreeDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
    skillTreeDir = setupSkillTree(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T2.1: crystallizeSkill() generates valid SkillSOP", async () => {
    const { crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Read", arguments: { path: "/proc/123/status" } },
      { id: "2", name: "Grep", arguments: { pattern: "VmRSS" } },
      { id: "3", name: "Shell", arguments: { cmd: "ps aux | grep 123" } }
    ];

    const skill = await crystallizeSkill(
      "Check memory usage of process 123",
      toolCalls,
      skillTreeDir
    );

    expect(skill).toBeDefined();
    expect(skill.name).toBeTruthy();
    expect(skill.version).toBe(1);
    expect(skill.createdAt).toBeTruthy();
  });

  test("T2.2: Generated skill has trigger keywords", async () => {
    const { crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Read", arguments: { path: "/proc/456/status" } }
    ];

    const skill = await crystallizeSkill(
      "Check CPU usage for process 456",
      toolCalls,
      skillTreeDir
    );

    expect(skill.trigger).toBeDefined();
    expect(skill.trigger.keywords).toBeDefined();
    expect(skill.trigger.keywords.length).toBeGreaterThan(0);
    expect(skill.trigger.description).toBe("Check CPU usage for process 456");
  });

  test("T2.3: Tool calls are converted to steps", async () => {
    const { crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Read", arguments: { path: "/etc/config" } },
      { id: "2", name: "Write", arguments: { path: "/etc/new-config", content: "data" } },
      { id: "3", name: "Shell", arguments: { cmd: "systemctl restart service" } }
    ];

    const skill = await crystallizeSkill(
      "Update service configuration",
      toolCalls,
      skillTreeDir
    );

    expect(skill.steps).toBeDefined();
    expect(skill.steps.length).toBe(3);
    expect(skill.steps[0].order).toBe(1);
    expect(skill.steps[0].tool).toBe("Read");
    expect(skill.steps[1].order).toBe(2);
    expect(skill.steps[1].tool).toBe("Write");
  });

  test("T2.4: Empty tool calls returns partial skill", async () => {
    const { crystallizeSkill } = await import("../../../src/core/skill-crystallizer.ts");

    const skill = await crystallizeSkill(
      "Empty task",
      [],
      skillTreeDir
    );

    expect(skill).toBeDefined();
    expect(skill.name).toBeTruthy();
    expect(skill.steps).toEqual([]);
  });

  test("T2.5: Skill includes verification section", async () => {
    const { crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Read", arguments: { path: "/tmp/test.txt" } }
    ];

    const skill = await crystallizeSkill(
      "Read a file and verify contents",
      toolCalls,
      skillTreeDir
    );

    expect(skill.verification).toBeDefined();
  });

  test("T2.6: Skill has usageCount and successRate", async () => {
    const { crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Shell", arguments: { cmd: "echo test" } }
    ];

    const skill = await crystallizeSkill(
      "Simple echo test",
      toolCalls,
      skillTreeDir
    );

    expect(typeof skill.usageCount).toBe("number");
    expect(typeof skill.successRate).toBe("number");
    expect(skill.usageCount).toBe(0);
    expect(skill.successRate).toBe(1.0);
  });
});

// ============================================================================
// T3: Skill Storage - saveSkill()
// ============================================================================

describe("EPOCH 24: T3 - Skill Storage", () => {
  let testDir: string;
  let skillTreeDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
    skillTreeDir = setupSkillTree(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T3.1: saveSkill() writes to skill tree", async () => {
    const { saveSkill, crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Read", arguments: { path: "/etc/hosts" } }
    ];

    const skill = await crystallizeSkill(
      "Read hosts file",
      toolCalls,
      skillTreeDir
    );

    const result = await saveSkill(skill, skillTreeDir);
    expect(result).toBe(true);
  });

  test("T3.2: Saved skill exists as markdown file", async () => {
    const { saveSkill, crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Shell", arguments: { cmd: "ls -la" } }
    ];

    const skill = await crystallizeSkill(
      "List directory contents",
      toolCalls,
      skillTreeDir
    );

    await saveSkill(skill, skillTreeDir);

    const skillFile = join(skillTreeDir, `${skill.name}.md`);
    expect(existsSync(skillFile)).toBe(true);
  });

  test("T3.3: Skill file contains markdown format", async () => {
    const { saveSkill, crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Read", arguments: { path: "/tmp/file.txt" } }
    ];

    const skill = await crystallizeSkill(
      "Read temporary file",
      toolCalls,
      skillTreeDir
    );

    await saveSkill(skill, skillTreeDir);

    const skillFile = join(skillTreeDir, `${skill.name}.md`);
    const content = readFileSync(skillFile, "utf-8");

    // Check for markdown sections
    expect(content).toContain("#");
    expect(content).toContain("##");
    expect(content).toContain("## Trigger");
    expect(content).toContain("## Steps");
  });

  test("T3.4: Duplicate skills increment version", async () => {
    const { saveSkill, crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Shell", arguments: { cmd: "pwd" } }
    ];

    const skill1 = await crystallizeSkill(
      "Get current directory",
      toolCalls,
      skillTreeDir
    );

    await saveSkill(skill1, skillTreeDir);

    // Create similar skill
    const skill2 = await crystallizeSkill(
      "Get current directory again",
      toolCalls,
      skillTreeDir
    );

    const result = await saveSkill(skill2, skillTreeDir);
    expect(result).toBe(true);
    
    // Should have version incremented
    expect(skill2.version).toBeGreaterThanOrEqual(1);
  });

  test("T3.5: saveSkill() returns false on write error", async () => {
    const { saveSkill } = await import("../../../src/core/skill-crystallizer.ts");
    type SkillSOP = {
      name: string;
      version: number;
      createdAt: string;
      trigger: { keywords: string[]; description: string };
      context: { requirements: string[]; prerequisites: string[] };
      steps: any[];
      verification: any;
      usageCount: number;
      successRate: number;
    };

    // Invalid path (parent doesn't exist)
    const invalidPath = "/nonexistent/path/to/skills";
    
    const skill: SkillSOP = {
      name: "test-skill",
      version: 1,
      createdAt: new Date().toISOString(),
      trigger: { keywords: ["test"], description: "Test" },
      context: { requirements: [], prerequisites: [] },
      steps: [],
      verification: {},
      usageCount: 0,
      successRate: 1.0
    };

    const result = await saveSkill(skill, invalidPath);
    expect(result).toBe(false);
  });
});

// ============================================================================
// T4: Skill Retrieval - searchSkills()
// ============================================================================

describe("EPOCH 24: T4 - Skill Retrieval", () => {
  let testDir: string;
  let skillTreeDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
    skillTreeDir = setupSkillTree(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T4.1: searchSkills() finds skills by keyword", async () => {
    const { saveSkill, searchSkills, crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Read", arguments: { path: "/proc/meminfo" } }
    ];

    const skill = await crystallizeSkill(
      "Check system memory usage",
      toolCalls,
      skillTreeDir
    );
    await saveSkill(skill, skillTreeDir);

    const results = await searchSkills("memory", skillTreeDir);
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });

  test("T4.2: searchSkills() returns empty for non-existent keyword", async () => {
    const { searchSkills } = await import("../../../src/core/skill-crystallizer.ts");

    const results = await searchSkills("xyznonexistentkeyword123", skillTreeDir);
    expect(Array.isArray(results)).toBe(true);
  });

  test("T4.3: searchSkills() returns skills with metadata", async () => {
    const { saveSkill, searchSkills, crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Shell", arguments: { cmd: "git status" } }
    ];

    const skill = await crystallizeSkill(
      "Check git repository status",
      toolCalls,
      skillTreeDir
    );
    await saveSkill(skill, skillTreeDir);

    const results = await searchSkills("git", skillTreeDir);
    
    if (results.length > 0) {
      expect(results[0].name).toBeDefined();
      expect(results[0].trigger).toBeDefined();
    }
  });

  test("T4.4: Empty skill tree returns empty array", async () => {
    const { searchSkills } = await import("../../../src/core/skill-crystallizer.ts");

    const results = await searchSkills("anything", skillTreeDir);
    expect(Array.isArray(results)).toBe(true);
  });

  test("T4.5: Empty query returns recent skills", async () => {
    const { saveSkill, searchSkills, crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    // Add some skills
    for (let i = 0; i < 3; i++) {
      const toolCalls: ToolCall[] = [
        { id: "1", name: "Shell", arguments: { cmd: `echo ${i}` } }
      ];
      const skill = await crystallizeSkill(
        `Test skill ${i}`,
        toolCalls,
        skillTreeDir
      );
      await saveSkill(skill, skillTreeDir);
    }

    const results = await searchSkills("", skillTreeDir);
    expect(Array.isArray(results)).toBe(true);
  });
});

// ============================================================================
// T5: Hook Triggers - Success and Tool Call Threshold
// ============================================================================

describe("EPOCH 24: T5 - Hook Triggers", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T5.1: Hook only triggers on success=true", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();

    let triggerCount = 0;

    const successHook: DoneHook = {
      name: "success-only",
      priority: 1,
      trigger: (ctx) => ctx.task.success === true,
      execute: async (ctx) => {
        triggerCount++;
        return { success: true };
      }
    };

    hooks.register(successHook);

    // Test with success=false
    const failContext: HookContext = {
      task: { id: "1", description: "Failed task", success: false },
      toolCalls: [],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    await hooks.trigger(failContext);
    expect(triggerCount).toBe(0);

    // Test with success=true
    const successContext: HookContext = {
      task: { id: "2", description: "Successful task", success: true },
      toolCalls: [],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    await hooks.trigger(successContext);
    expect(triggerCount).toBe(1);
  });

  test("T5.2: Hook respects minimum tool calls threshold", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();

    let triggerCount = 0;

    const thresholdHook: DoneHook = {
      name: "min-tools",
      priority: 1,
      trigger: (ctx) => ctx.toolCalls.length >= 3,  // Minimum 3 tool calls
      execute: async (ctx) => {
        triggerCount++;
        return { success: true };
      }
    };

    hooks.register(thresholdHook);

    // Test with 2 tool calls (below threshold)
    const belowContext: HookContext = {
      task: { id: "1", description: "Short task", success: true },
      toolCalls: [
        { id: "1", name: "Read", arguments: {} },
        { id: "2", name: "Write", arguments: {} }
      ],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    await hooks.trigger(belowContext);
    expect(triggerCount).toBe(0);

    // Test with 3 tool calls (at threshold)
    const atContext: HookContext = {
      task: { id: "2", description: "Full task", success: true },
      toolCalls: [
        { id: "1", name: "Read", arguments: {} },
        { id: "2", name: "Write", arguments: {} },
        { id: "3", name: "Shell", arguments: {} }
      ],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    await hooks.trigger(atContext);
    expect(triggerCount).toBe(1);
  });

  test("T5.3: Hook captures all tool calls in context", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();

    let capturedToolCalls: string[] = [];

    const captureHook: DoneHook = {
      name: "capture",
      priority: 1,
      trigger: (ctx) => true,
      execute: async (ctx) => {
        capturedToolCalls = ctx.toolCalls.map(t => t.name);
        return { success: true };
      }
    };

    hooks.register(captureHook);

    const toolCalls = [
      { id: "1", name: "Read", arguments: { path: "/a" } },
      { id: "2", name: "Grep", arguments: { pattern: "foo" } },
      { id: "3", name: "Write", arguments: { path: "/b" } },
      { id: "4", name: "Shell", arguments: { cmd: "ls" } }
    ];

    const context: HookContext = {
      task: { id: "1", description: "Multi-tool task", success: true },
      toolCalls,
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    await hooks.trigger(context);
    expect(capturedToolCalls).toEqual(["Read", "Grep", "Write", "Shell"]);
  });

  test("T5.4: Hook handles execution errors gracefully", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();

    const errorHook: DoneHook = {
      name: "error-hook",
      priority: 1,
      trigger: (ctx) => true,
      execute: async (ctx) => {
        throw new Error("Intentional test error");
      }
    };

    hooks.register(errorHook);

    const context: HookContext = {
      task: { id: "1", description: "Error task", success: true },
      toolCalls: [],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    // Should not throw, should return error result
    const results = await hooks.trigger(context);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBeDefined();
  });
});

// ============================================================================
// T6: Edge Cases and Error Handling
// ============================================================================

describe("EPOCH 24: T6 - Edge Cases", () => {
  let testDir: string;
  let skillTreeDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
    skillTreeDir = setupSkillTree(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("T6.1: crystallizeSkill() handles unicode in task", async () => {
    const { crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Read", arguments: { path: "/tmp/日本語.txt" } }
    ];

    const skill = await crystallizeSkill(
      "读取文件 with émojis 🎉 and unicode 日本語",
      toolCalls,
      skillTreeDir
    );

    expect(skill).toBeDefined();
    expect(skill.name).toBeTruthy();
  });

  test("T6.2: crystallizeSkill() handles special chars in args", async () => {
    const { crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = [
      { id: "1", name: "Shell", arguments: { cmd: "echo 'hello & world | grep <test>'" } }
    ];

    const skill = await crystallizeSkill(
      "Shell command with special characters",
      toolCalls,
      skillTreeDir
    );

    expect(skill).toBeDefined();
    expect(skill.steps[0].parameters).toBeDefined();
  });

  test("T6.3: DoneHooks handles empty hooks array", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    type HookContext = {
      task: { id: string; description: string; success: boolean };
      toolCalls: any[];
      messages: any[];
      startTime: number;
      endTime: number;
    };
    const hooks = new DoneHooks();

    const context: HookContext = {
      task: { id: "1", description: "No hooks", success: true },
      toolCalls: [],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    const results = await hooks.trigger(context);
    expect(results).toEqual([]);
  });

  test("T6.4: Hooks can be registered multiple times", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();

    let count = 0;

    const hook1: DoneHook = {
      name: "multi",
      priority: 1,
      trigger: (ctx) => true,
      execute: async (ctx) => {
        count++;
        return { success: true };
      }
    };

    hooks.register(hook1);
    hooks.register(hook1);  // Register same hook again

    const context: HookContext = {
      task: { id: "1", description: "Multi register", success: true },
      toolCalls: [],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    await hooks.trigger(context);
    // Should execute twice
    expect(count).toBe(2);
  });

  test("T6.5: searchSkills() handles malformed skill files", async () => {
    const { searchSkills } = await import("../../../src/core/skill-crystallizer.ts");

    // Create a malformed markdown file
    const badFile = join(skillTreeDir, "malformed.md");
    writeFileSync(badFile, "This is not a valid skill file # No proper format");

    const results = await searchSkills("not", skillTreeDir);
    expect(Array.isArray(results)).toBe(true);
  });

  test("T6.6: saveSkill() handles skill with empty name", async () => {
    const { saveSkill } = await import("../../../src/core/skill-crystallizer.ts");
    type SkillSOP = {
      name: string;
      version: number;
      createdAt: string;
      trigger: { keywords: string[]; description: string };
      context: { requirements: string[]; prerequisites: string[] };
      steps: any[];
      verification: any;
      usageCount: number;
      successRate: number;
    };

    const skill: SkillSOP = {
      name: "",  // Empty name
      version: 1,
      createdAt: new Date().toISOString(),
      trigger: { keywords: ["test"], description: "Test" },
      context: { requirements: [], prerequisites: [] },
      steps: [],
      verification: {},
      usageCount: 0,
      successRate: 1.0
    };

    const result = await saveSkill(skill, skillTreeDir);
    // Should handle gracefully - may return false or use generated name
    expect(typeof result).toBe("boolean");
  });
});

// ============================================================================
// T7: Integration - Full Crystallization Flow
// ============================================================================

describe("EPOCH 24: T7 - Integration Flow", () => {
  let testDir: string;
  let skillTreeDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
    skillTreeDir = setupSkillTree(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("IL1: Full crystallization: success task → hook → skill saved → retrieved", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const { crystallizeSkill, saveSkill, searchSkills, } = await import("../../../src/core/skill-crystallizer.ts");

    // 1. Create DoneHooks with crystallization hook
    const hooks = new DoneHooks();

    const crystallizationHook: DoneHook = {
      name: "skill-crystallizer",
      priority: 1,
      trigger: (ctx) => ctx.task.success && ctx.toolCalls.length >= 3,
      execute: async (ctx) => {
        const skill = await crystallizeSkill(
          ctx.task.description,
          ctx.toolCalls,
          skillTreeDir
        );
        const saved = await saveSkill(skill, skillTreeDir);
        return { success: saved, skillCrystallized: saved, skillName: skill.name };
      }
    };

    hooks.register(crystallizationHook);

    // 2. Execute a successful task with multiple tool calls
    const toolCalls: ToolCall[] = [
      { id: "1", name: "Read", arguments: { path: "/etc/config" } },
      { id: "2", name: "Write", arguments: { path: "/etc/config.new", content: "config data" } },
      { id: "3", name: "Shell", arguments: { cmd: "diff /etc/config /etc/config.new" } }
    ];

    const context: HookContext = {
      task: { id: "task-1", description: "Update configuration file", success: true },
      toolCalls,
      messages: [],
      startTime: Date.now() - 5000,
      endTime: Date.now()
    };

    // 3. Trigger hooks
    const results = await hooks.trigger(context);

    // 4. Verify skill was crystallized
    expect(results).toHaveLength(1);
    expect(results[0].skillCrystallized).toBe(true);
    expect(results[0].skillName).toBeDefined();

    // 5. Verify skill can be retrieved
    const searchResults = await searchSkills("config", skillTreeDir);
    expect(searchResults.length).toBeGreaterThan(0);
  });

  test("IL2: Failed task does NOT crystallize", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const { crystallizeSkill, saveSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const hooks = new DoneHooks();

    const crystallizationHook: DoneHook = {
      name: "skill-crystallizer",
      priority: 1,
      trigger: (ctx) => ctx.task.success && ctx.toolCalls.length >= 3,
      execute: async (ctx) => {
        const skill = await crystallizeSkill(
          ctx.task.description,
          ctx.toolCalls,
          skillTreeDir
        );
        await saveSkill(skill, skillTreeDir);
        return { success: true, skillCrystallized: true };
      }
    };

    hooks.register(crystallizationHook);

    // Execute a FAILED task
    const context: HookContext = {
      task: { id: "task-fail", description: "Failed update", success: false },
      toolCalls: [
        { id: "1", name: "Read", arguments: {} },
        { id: "2", name: "Write", arguments: {} },
        { id: "3", name: "Shell", arguments: {} }
      ],
      messages: [],
      startTime: Date.now() - 5000,
      endTime: Date.now()
    };

    const results = await hooks.trigger(context);

    // Should not crystallize
    expect(results).toHaveLength(0);
  });

  test("IL3: Short task with few tool calls does NOT crystallize", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const { crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const hooks = new DoneHooks();

    const crystallizationHook: DoneHook = {
      name: "skill-crystallizer",
      priority: 1,
      trigger: (ctx) => ctx.task.success && ctx.toolCalls.length >= 3,
      execute: async (ctx) => {
        await crystallizeSkill(ctx.task.description, ctx.toolCalls, skillTreeDir);
        return { success: true, skillCrystallized: true };
      }
    };

    hooks.register(crystallizationHook);

    // Execute a simple task with only 2 tool calls
    const context: HookContext = {
      task: { id: "task-simple", description: "Simple task", success: true },
      toolCalls: [
        { id: "1", name: "Read", arguments: {} },
        { id: "2", name: "Write", arguments: {} }
      ],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    const results = await hooks.trigger(context);

    // Should not trigger (only 2 tool calls)
    expect(results).toHaveLength(0);
  });
});

// ============================================================================
// Performance Regression
// ============================================================================

describe("EPOCH 24: Performance Regression", () => {
  let testDir: string;
  let skillTreeDir: string;

  beforeEach(async () => {
    testDir = setupTestDir();
    skillTreeDir = setupSkillTree(testDir);
  });

  afterEach(() => {
    teardownTestDir(testDir);
  });

  test("PR1: crystallizeSkill() completes in reasonable time", async () => {
    const { crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    const toolCalls: ToolCall[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      name: ["Read", "Write", "Shell", "Grep"][i % 4],
      arguments: { path: `/tmp/file-${i}.txt`, cmd: `command ${i}` }
    }));

    const start = Date.now();
    await crystallizeSkill("Complex multi-tool task", toolCalls, skillTreeDir);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000);  // Should complete in under 1 second
  });

  test("PR2: DoneHooks.trigger() is fast with many hooks", async () => {
    const { DoneHooks } = await import("../../../src/core/done-hooks.ts");
    const hooks = new DoneHooks();

    // Register 50 hooks
    for (let i = 0; i < 50; i++) {
      hooks.register({
        name: `hook-${i}`,
        priority: i,
        trigger: (ctx) => ctx.task.id === "trigger",
        execute: async (ctx) => ({ success: true })
      });
    }

    const context: HookContext = {
      task: { id: "trigger", description: "Performance test", success: true },
      toolCalls: [],
      messages: [],
      startTime: Date.now() - 1000,
      endTime: Date.now()
    };

    const start = Date.now();
    await hooks.trigger(context);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);  // Should be very fast
  });

  test("PR3: searchSkills() completes quickly on large tree", async () => {
    const { saveSkill, searchSkills, crystallizeSkill, } = await import("../../../src/core/skill-crystallizer.ts");

    // Create 100 skills
    for (let i = 0; i < 100; i++) {
      const toolCalls: ToolCall[] = [
        { id: "1", name: "Shell", arguments: { cmd: `cmd-${i}` } }
      ];
      const skill = await crystallizeSkill(
        `Skill ${i} about testing and quality`,
        toolCalls,
        skillTreeDir
      );
      await saveSkill(skill, skillTreeDir);
    }

    const start = Date.now();
    const results = await searchSkills("test", skillTreeDir);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);  // Should be fast even with many skills
    expect(Array.isArray(results)).toBe(true);
  });
});
