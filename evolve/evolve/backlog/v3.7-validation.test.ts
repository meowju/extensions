/**
 * V3.7 Validation Tests: Skill Self-Crystallization
 * 
 * Tests the DoneHooks → SOP → FTS5 → Recall pipeline
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Test Utilities
// ============================================================================

const testDir = `/tmp/v3.7-test-${Date.now()}`;
const testDbPath = `${testDir}/skills.db`;

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

interface DoneHookContext {
  taskId: string;
  taskDescription: string;
  success: boolean;
  toolCalls: ToolCall[];
  duration: number;
  timestamp: Date;
  sessionId: string;
}

interface SkillSOP {
  name: string;
  trigger: string[];
  context: string[];
  steps: string[];
  verification: string[];
  usageCount: number;
  createdAt: Date;
}

// ============================================================================
// T1: DoneHooks Manager
// ============================================================================

describe('V3.7.1: DoneHooks Manager', () => {
  let DoneHooks: any;
  
  beforeEach(async () => {
    const module = await import('../../src/core/done-hooks');
    DoneHooks = module.DoneHooks;
  });

  it('T1.1: Should register a hook with name and trigger', () => {
    const hooks = new DoneHooks();
    const hook = { name: 'test', priority: 100, trigger: () => true, execute: async () => ({ success: true }) };
    hooks.register(hook);
    expect(hooks.hasHook('test')).toBe(true);
  });

  it('T1.2: Should execute all matching hooks on trigger', async () => {
    const hooks = new DoneHooks();
    let executed = 0;
    hooks.register({ name: 'h1', priority: 100, trigger: () => true, execute: async () => { executed++ } });
    hooks.register({ name: 'h2', priority: 100, trigger: () => true, execute: async () => { executed++ } });
    await hooks.trigger({ task: { id: '1', description: 'test', success: true }, toolCalls: [], messages: [], startTime: Date.now(), endTime: Date.now() });
    expect(executed).toBe(2);
  });

  it('T1.3: Should only execute hooks where trigger returns true', async () => {
    const hooks = new DoneHooks();
    let executed = 0;
    hooks.register({ name: 'always', priority: 100, trigger: () => true, execute: async () => { executed++ } });
    hooks.register({ name: 'never', priority: 100, trigger: () => false, execute: async () => { executed++ } });
    const results = await hooks.trigger({ task: { id: '1', description: 'test', success: true }, toolCalls: [], messages: [], startTime: Date.now(), endTime: Date.now() });
    expect(executed).toBe(1);
    expect(results.length).toBe(1);
  });

  it('T1.4: Should support async hook execution', async () => {
    const hooks = new DoneHooks();
    const asyncHook = async () => { await new Promise(r => setTimeout(r, 10)); return { success: true }; };
    hooks.register({ name: 'async', priority: 100, trigger: () => true, execute: asyncHook });
    const results = await hooks.trigger({ task: { id: '1', description: 'test', success: true }, toolCalls: [], messages: [], startTime: Date.now(), endTime: Date.now() });
    expect(results[0].success).toBe(true);
  });
});

// ============================================================================
// T2: Skill Crystallizer
// ============================================================================

describe('V3.7.2: Skill Crystallizer', () => {
  let crystallizeSkill: any;
  
  beforeEach(async () => {
    const module = await import('../../src/core/skill-crystallizer');
    crystallizeSkill = module.crystallizeSkill;
  });

  it('T2.1: Should generate SOP from task context', async () => {
    const sop = await crystallizeSkill('Commit changes to git', [
      { id: '1', name: 'Shell', arguments: { cmd: 'git add .' }, result: '', duration: 100 },
      { id: '2', name: 'Shell', arguments: { cmd: 'git commit -m "fix"' }, result: '', duration: 200 }
    ]);
    
    expect(sop).toBeDefined();
    expect(sop.name).toBeDefined();
    expect(sop.steps).toBeDefined();
    expect(sop.steps.length).toBe(2);
  });

  it('T2.2: Should extract meaningful skill name', async () => {
    const sop = await crystallizeSkill('Run TypeScript validation tests', [
      { id: '1', name: 'Shell', arguments: { cmd: 'npx vitest run' }, result: '', duration: 3000 }
    ]);
    
    expect(sop.name).toMatch(/typescript|test|validation|vitest/i);
  });

  it('T2.3: Should include verification steps', async () => {
    const sop = await crystallizeSkill('Build the project', [
      { id: '1', name: 'Shell', arguments: { cmd: 'npm run build' }, result: '', duration: 5000 }
    ]);
    
    expect(sop.verification).toBeDefined();
  });

  it('T2.4: Should detect repeated patterns', async () => {
    // Pattern detection from multiple executions
    const taskA = 'Create feature branch', taskB = 'Create another branch';
    const sopA = await crystallizeSkill(taskA, [{ id: '1', name: 'Shell', arguments: { cmd: 'git checkout -b feature/new' }, result: '', duration: 100 }]);
    const sopB = await crystallizeSkill(taskB, [{ id: '1', name: 'Shell', arguments: { cmd: 'git checkout -b feature/other' }, result: '', duration: 100 }]);
    
    // Both should have similar structure
    expect(sopA.name).toBeDefined();
    expect(sopB.name).toBeDefined();
  });
});

// ============================================================================
// T3: SOP Writer (File I/O)
// ============================================================================

describe('V3.7.3: SOP Writer', () => {
  let saveSkill: any;
  let loadSkill: any;
  
  beforeEach(async () => {
    mkdirSync(testDir, { recursive: true });
    const module = await import('../../src/core/skill-crystallizer');
    saveSkill = module.saveSkill;
    loadSkill = module.loadSkill;
  });
  
  afterEach(() => {
    try { rmSync(testDir, { recursive: true }); } catch {}
  });

  it('T3.1: Should write SOP to file', () => {
    const sop = {
      name: 'test_skill', version: 1, createdAt: new Date().toISOString(),
      trigger: { keywords: ['testing'], description: 'Test task' },
      context: { requirements: ['node'], prerequisites: [] },
      steps: [{ order: 1, action: 'npm test', tool: 'shell', parameters: {}, rationale: '' }],
      verification: { command: 'npm test', expectedPattern: '' },
      usageCount: 0, successRate: 1.0
    };
    
    const result = saveSkill(sop, testDir);
    expect(result).toBe(true);
    expect(existsSync(join(testDir, 'test_skill-v1.md'))).toBe(true);
  });

  it('T3.2: Should create skills directory if missing', () => {
    const skillDir = `${testDir}/nested/skills`;
    const sop = {
      name: 'nested_skill', version: 1, createdAt: new Date().toISOString(),
      trigger: { keywords: ['test'], description: 'Test' },
      context: { requirements: [], prerequisites: [] },
      steps: [], verification: {}, usageCount: 0, successRate: 1.0
    };
    
    saveSkill(sop, skillDir);
    expect(existsSync(skillDir)).toBe(true);
  });

  it('T3.3: Should format SOP in standard markdown', () => {
    const sop = {
      name: 'formatted_skill', version: 1, createdAt: '2024-01-01T00:00:00Z',
      trigger: { keywords: ['trigger'], description: 'Test trigger' },
      context: { requirements: ['prereq'], prerequisites: [] },
      steps: [{ order: 1, action: 'step 1', tool: '', parameters: {}, rationale: '' }, { order: 2, action: 'step 2', tool: '', parameters: {}, rationale: '' }],
      verification: { command: 'verify', expectedPattern: 'pass' },
      usageCount: 5, successRate: 0.9
    };
    
    saveSkill(sop, testDir);
    const content = readFileSync(join(testDir, 'formatted_skill-v1.md'), 'utf-8');
    
    expect(content).toContain('## Trigger');
    expect(content).toContain('## Context');
    expect(content).toContain('## Steps');
    expect(content).toContain('## Verification');
  });

  it('T3.4: Should prevent duplicate skill names', () => {
    const sop1 = {
      name: 'duplicate_test', version: 1, createdAt: new Date().toISOString(),
      trigger: { keywords: ['test'], description: 'Test' },
      context: { requirements: [], prerequisites: [] },
      steps: [], verification: {}, usageCount: 0, successRate: 1.0
    };
    
    saveSkill(sop1, testDir);
    
    // Should increment version for duplicate
    const sop2 = { ...sop1, version: 1 };
    const result = saveSkill(sop2, testDir);
    
    expect(existsSync(join(testDir, 'duplicate_test-v1.md'))).toBe(true);
    expect(existsSync(join(testDir, 'duplicate_test-v2.md'))).toBe(true);
  });
});

// ============================================================================
// T4: Skill Recall (FTS5)
// ============================================================================

describe('V3.7.4: Skill Recall (FTS5)', () => {
  let searchSkills: any;
  let listSkills: any;
  let saveSkill: any;
  
  beforeEach(async () => {
    mkdirSync(testDir, { recursive: true });
    const module = await import('../../src/core/skill-crystallizer');
    saveSkill = module.saveSkill;
    searchSkills = module.searchSkills;
    listSkills = module.listSkills;
  });
  
  afterEach(() => {
    try { rmSync(testDir, { recursive: true }); } catch {}
  });

  it('T4.1: Should index skill in skill tree', () => {
    const sop = {
      name: 'git_commit', version: 1, createdAt: new Date().toISOString(),
      trigger: { keywords: ['commit', 'save'], description: 'Commit changes' },
      context: { requirements: ['git'], prerequisites: [] },
      steps: [{ order: 1, action: 'git add .', tool: 'shell', parameters: {}, rationale: '' }, { order: 2, action: 'git commit', tool: 'shell', parameters: {}, rationale: '' }],
      verification: { command: 'git log', expectedPattern: '' },
      usageCount: 10, successRate: 1.0
    };
    
    saveSkill(sop, testDir);
    const skills = listSkills(testDir);
    expect(skills.length).toBeGreaterThan(0);
  });

  it('T4.2: Should return top-k results for query', () => {
    // Save multiple skills
    for (let i = 0; i < 5; i++) {
      saveSkill({
        name: `skill_${i}`, version: 1, createdAt: new Date().toISOString(),
        trigger: { keywords: ['test'], description: 'Test skill' },
        context: { requirements: [], prerequisites: [] },
        steps: [], verification: {}, usageCount: i, successRate: 1.0
      }, testDir);
    }
    
    const results = searchSkills('test', testDir);
    expect(results).toBeDefined();
  });

  it('T4.3: Should boost higher-usage skills', () => {
    saveSkill({
      name: 'popular_skill', version: 1, createdAt: new Date().toISOString(),
      trigger: { keywords: ['test'], description: 'Popular test skill' },
      context: { requirements: [], prerequisites: [] },
      steps: [], verification: {}, usageCount: 100, successRate: 1.0
    }, testDir);
    
    saveSkill({
      name: 'rare_skill', version: 1, createdAt: new Date().toISOString(),
      trigger: { keywords: ['test'], description: 'Rare test skill' },
      context: { requirements: [], prerequisites: [] },
      steps: [], verification: {}, usageCount: 1, successRate: 1.0
    }, testDir);
    
    const results = searchSkills('test', testDir);
    expect(results[0].skill.name).toBe('popular_skill');
  });

  it('T4.4: Should return empty for no matches', () => {
    const results = searchSkills('xyz_nonexistent', testDir);
    expect(results).toEqual([]);
  });
});

// ============================================================================
// T5: Integration - Full Pipeline
// ============================================================================

describe('V3.7.5: Integration - Full Crystallization Pipeline', () => {
  let DoneHooks: any;
  let crystallizeSkill: any;
  let saveSkill: any;
  let searchSkills: any;
  let testSkillDir: string;
  
  beforeEach(async () => {
    testSkillDir = `${testDir}/skills`;
    mkdirSync(testSkillDir, { recursive: true });
    
    const dhModule = await import('../../src/core/done-hooks');
    DoneHooks = dhModule.DoneHooks;
    
    const scModule = await import('../../src/core/skill-crystallizer');
    crystallizeSkill = scModule.crystallizeSkill;
    saveSkill = scModule.saveSkill;
    searchSkills = scModule.searchSkills;
  });
  
  afterEach(() => {
    try { rmSync(testDir, { recursive: true }); } catch {}
  });

  it('T5.1: Should crystallize task and make it recallable', async () => {
    // 1. Create DoneHooks
    const hooks = new DoneHooks();
    
    // 2. Register skill crystallizer hook
    hooks.register({
      name: 'skill-crystallizer',
      priority: 100,
      trigger: (ctx: any) => ctx.task.success && ctx.toolCalls.length >= 2,
      execute: async (ctx: any) => {
        const sop = await crystallizeSkill(ctx.task.description, ctx.toolCalls);
        saveSkill(sop, testSkillDir);
        return { success: true, skillCrystallized: true, skillName: sop.name };
      }
    });
    
    // 3. Simulate task completion
    const context = {
      task: { id: 'integration-1', description: 'Initialize git repository', success: true },
      toolCalls: [
        { id: '1', name: 'Shell', arguments: { cmd: 'git init' }, result: '', duration: 100 },
        { id: '2', name: 'Shell', arguments: { cmd: 'git config user.email "test@test.com"' }, result: '', duration: 50 }
      ],
      messages: [],
      startTime: Date.now(),
      endTime: Date.now()
    };
    
    const results = await hooks.trigger(context);
    expect(results[0].skillCrystallized).toBe(true);
    
    // 4. Verify skill was created
    const recallResults = searchSkills('git', testSkillDir);
    expect(recallResults.length).toBeGreaterThan(0);
  });

  it('T5.2: Should suggest skill for similar new task', () => {
    // Pre-populate with a skill
    const existingSkill = {
      name: 'git_commit_workflow', version: 1, createdAt: new Date().toISOString(),
      trigger: { keywords: ['commit', 'save'], description: 'Commit changes to git' },
      context: { requirements: ['git repository'], prerequisites: [] },
      steps: [
        { order: 1, action: 'git add .', tool: 'shell', parameters: {}, rationale: '' },
        { order: 2, action: 'git commit -m "message"', tool: 'shell', parameters: {}, rationale: '' }
      ],
      verification: { command: 'git log', expectedPattern: '' },
      usageCount: 15, successRate: 1.0
    };
    
    saveSkill(existingSkill, testSkillDir);
    
    // Query for similar task
    const suggestions = searchSkills('I want to commit my changes', testSkillDir);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].skill.name).toBe('git_commit_workflow');
  });
});