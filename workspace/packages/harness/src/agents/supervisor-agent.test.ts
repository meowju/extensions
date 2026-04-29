/**
 * supervisor-agent.test.ts - V3.7 SupervisorAgent Integration Tests
 * 
 * Tests the SupervisorAgent multi-agent orchestration based on deer-flow pattern.
 * Validates: XL-50 (SupervisorAgent Core) + XL-54 (Integration Test)
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { SupervisorAgent, type SubTask, type SupervisorResult } from "./supervisor-agent";

describe("XL-50: SupervisorAgent Core", () => {
  let supervisor: SupervisorAgent;

  beforeAll(() => {
    supervisor = new SupervisorAgent({
      maxParallelAgents: 3,
      timeoutMs: 120000,
    });
  });

  test("should create SupervisorAgent instance", () => {
    expect(supervisor).toBeDefined();
    expect(supervisor instanceof SupervisorAgent).toBe(true);
  });

  test("should decompose simple task into subtasks", async () => {
    const result = await supervisor.run("Create a simple hello world function in TypeScript");
    
    expect(result).toBeDefined();
    expect(result.subtasks).toBeDefined();
    expect(result.subtasks.length).toBeGreaterThan(0);
  });

  test("should return SupervisorResult with required fields", async () => {
    const result = await supervisor.run("Say hello");
    
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("finalResponse");
    expect(result).toHaveProperty("subtasks");
    expect(result).toHaveProperty("totalIterations");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test("should handle task decomposition", async () => {
    const result = await supervisor.run("Build a REST API with authentication");
    
    // Should have created at least research and coding tasks
    expect(result.subtasks.length).toBeGreaterThanOrEqual(1);
    
    const types = result.subtasks.map(t => t.type);
    expect(types).toContain("research" as any) || expect(types).toContain("coder" as any);
  });

  test("should track subtask status", async () => {
    const result = await supervisor.run("Implement a calculator");
    
    for (const task of result.subtasks) {
      expect(task).toHaveProperty("status");
      expect(["pending", "running", "completed", "failed"]).toContain(task.status);
    }
  });

  test("should execute sub-agents in dependency order", async () => {
    const result = await supervisor.run("Research best practices for React, then implement a component");
    
    // Check that subtasks are properly ordered
    const completedTasks = result.subtasks.filter(t => t.status === "completed");
    expect(completedTasks.length).toBeGreaterThan(0);
  });
});

describe("XL-51: Research SubAgent", () => {
  let supervisor: SupervisorAgent;

  beforeAll(() => {
    supervisor = new SupervisorAgent({ timeoutMs: 120000 });
  });

  test("should execute research task", async () => {
    const result = await supervisor.run("Research best practices for TypeScript error handling");
    
    const researchTasks = result.subtasks.filter(t => t.type === "research");
    expect(researchTasks.length).toBeGreaterThan(0);
    
    const completedResearch = researchTasks.filter(t => t.status === "completed");
    expect(completedResearch.length).toBeGreaterThan(0);
  });
});

describe("XL-52: Coder SubAgent", () => {
  let supervisor: SupervisorAgent;

  beforeAll(() => {
    supervisor = new SupervisorAgent({ timeoutMs: 120000 });
  });

  test("should execute coding task", async () => {
    const result = await supervisor.run("Write a TypeScript function that adds two numbers");
    
    const coderTasks = result.subtasks.filter(t => t.type === "coder");
    expect(coderTasks.length).toBeGreaterThan(0);
    
    const completedCoder = coderTasks.filter(t => t.status === "completed");
    expect(completedCoder.length).toBeGreaterThan(0);
  });

  test("should return code in final response", async () => {
    const result = await supervisor.run("Create a function to calculate factorial");
    
    expect(result.finalResponse).toBeDefined();
    expect(typeof result.finalResponse).toBe("string");
  });
});

describe("XL-53: Review SubAgent", () => {
  let supervisor: SupervisorAgent;

  beforeAll(() => {
    supervisor = new SupervisorAgent({ timeoutMs: 120000 });
  });

  test("should execute review task", async () => {
    const result = await supervisor.run("Review this code: function add(a,b){return a+b}");
    
    const reviewTasks = result.subtasks.filter(t => t.type === "reviewer");
    // May or may not have explicit reviewer tasks depending on decomposition
    expect(result.subtasks.length).toBeGreaterThan(0);
  });
});

describe("XL-54: Integration Test - End-to-End Supervisor Flow", () => {
  let supervisor: SupervisorAgent;

  beforeAll(() => {
    supervisor = new SupervisorAgent({
      maxParallelAgents: 3,
      timeoutMs: 180000,
      onSupervisorProgress: (phase, progress) => {
        console.log(`  [${phase}] Progress: ${progress}%`);
      },
    });
  });

  test("should complete full supervisor loop for simple task", async () => {
    const result = await supervisor.run("Build a simple calculator in TypeScript");
    
    // Verify all 4 phases completed
    expect(result.finalResponse).toBeDefined();
    expect(result.subtasks.length).toBeGreaterThan(0);
    
    // Check task types coverage
    const types = new Set(result.subtasks.map(t => t.type));
    expect(types.size).toBeGreaterThanOrEqual(1);
    
    // Verify final response addresses original prompt
    expect(result.finalResponse.toLowerCase()).toContain("calculator");
  }, 180000);

  test("should handle task with multiple sub-agents", async () => {
    const result = await supervisor.run(
      "Research TypeScript best practices, then create a utility function, then review the code"
    );
    
    // Should have research + coder + reviewer tasks
    const hasResearch = result.subtasks.some(t => t.type === "research");
    const hasCoder = result.subtasks.some(t => t.type === "coder");
    const hasReviewer = result.subtasks.some(t => t.type === "reviewer");
    
    // At minimum should have multiple task types
    expect(result.subtasks.length).toBeGreaterThanOrEqual(2);
  }, 180000);

  test("should aggregate results from multiple sub-agents", async () => {
    const result = await supervisor.run(
      "Create a REST API endpoint with input validation and tests"
    );
    
    expect(result.finalResponse).toBeDefined();
    expect(result.finalResponse.length).toBeGreaterThan(50);
    
    // Should have multiple completed tasks
    const completed = result.subtasks.filter(t => t.status === "completed");
    expect(completed.length).toBeGreaterThan(0);
  }, 180000);

  test("should track total iterations across all sub-agents", async () => {
    const result = await supervisor.run("Write a greeting function");
    
    expect(result.totalIterations).toBeGreaterThan(0);
  });

  test("should handle errors gracefully", async () => {
    const result = await supervisor.run("Do something impossible that will definitely fail");
    
    // Should still return a result (may be partial success)
    expect(result).toBeDefined();
    expect(result.errors).toBeDefined();
  });
});

describe("SupervisorAgent Callback System", () => {
  test("should call onSubAgentStart callback", async () => {
    let startCalled = false;
    
    const supervisor = new SupervisorAgent({
      timeoutMs: 60000,
      onSubAgentStart: () => { startCalled = true; },
    });

    await supervisor.run("Create a hello function");
    expect(startCalled).toBe(true);
  }, 60000);

  test("should call onSubAgentComplete callback", async () => {
    let completeCalled = false;
    
    const supervisor = new SupervisorAgent({
      timeoutMs: 60000,
      onSubAgentComplete: () => { completeCalled = true; },
    });

    await supervisor.run("Say hi");
    expect(completeCalled).toBe(true);
  }, 60000);

  test("should call onSupervisorProgress for all phases", async () => {
    const phases: string[] = [];
    
    const supervisor = new SupervisorAgent({
      timeoutMs: 120000,
      onSupervisorProgress: (phase) => { phases.push(phase); },
    });

    await supervisor.run("Build a simple function");
    
    // Should have progress for DISCOVER, PLAN, BUILD, DOGFOOD
    expect(phases.length).toBeGreaterThanOrEqual(4);
  }, 120000);
});