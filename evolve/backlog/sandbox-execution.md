# Proposal: Sandbox Execution Environment

**Status:** DISCOVERED  
**Priority:** P0  
**Source:** OpenAI Agents SDK (24,990 stars)  
**Date:** 2026-04-27  
**Dependencies:** None (can be built standalone)  

---

## Executive Summary

Implement sandboxed execution environments that allow agents to work with files, run commands, and execute code in isolated containers. This is a foundational capability for autonomous coding agents to handle long-horizon tasks safely.

**Reference:** https://github.com/openai/openai-agents-python

---

## Problem Statement

Current Meow execution is **in-process** - all shell commands, file operations, and tool calls run directly in the host environment. This limits:
- Long-horizon task execution (hours/days)
- Safe experimentation with code changes
- Parallel workstreams
- Resource isolation

---

## Competitor Analysis

### OpenAI Agents SDK - Sandbox Agents
```python
agent = SandboxAgent(
    name="Workspace Assistant",
    instructions="Inspect the sandbox workspace before answering.",
    default_manifest=Manifest(entries={
        "repo": GitRepo(repo="openai/openai-agents-python", ref="main"),
    })
)

result = Runner.run_sync(
    agent,
    "Inspect the repo README and summarize what this project does.",
    run_config=RunConfig(sandbox=SandboxRunConfig(client=UnixLocalSandboxClient()))
)
```

**Key Patterns:**
1. **Manifest** - Defines what's in the sandbox (repo, files, environment)
2. **Sandbox Clients** - UnixLocalSandboxClient, DockerSandboxClient, RemoteSandboxClient
3. **Isolation** - Filesystem, network, and process isolation
4. **State Persistence** - Sandbox state can be snapshotted and restored

### Deer-Flow - Sandbox Execution
- Sub-agents execute in sandboxed environments
- Filesystem isolation prevents accidental damage
- Network sandboxing available

---

## Implementation Plan

### Phase 1: Local Sandbox (Simplest)
```
src/sandbox/
├── sandbox.ts           # Core sandbox interface
├── local-sandbox.ts     # UnixLocalSandboxClient implementation
├── sandbox-agent.ts     # Agent wrapper for sandboxed execution
└── manifest.ts          # Sandbox contents definition
```

### Core Interface
```typescript
interface SandboxClient {
  // Initialize sandbox with manifest
  initialize(manifest: Manifest): Promise<SandboxHandle>;
  
  // Execute command in sandbox
  exec(handle: SandboxHandle, cmd: string): Promise<ExecutionResult>;
  
  // Read file from sandbox
  readFile(handle: SandboxHandle, path: string): Promise<string>;
  
  // Write file to sandbox
  writeFile(handle: SandboxHandle, path: string, content: string): Promise<void>;
  
  // Snapshot/restore state
  snapshot(handle: SandboxHandle): Promise<Snapshot>;
  restore(snapshot: Snapshot): Promise<SandboxHandle>;
  
  // Cleanup
  destroy(handle: SandboxHandle): Promise<void>;
}

interface Manifest {
  entries: {
    repo?: { repo: string; ref: string };  // Git repo to clone
    files?: { path: string; content: string }[];  // Individual files
    env?: Record<string, string>;  // Environment variables
  };
  workspace?: string;  // Working directory in sandbox
}

interface SandboxHandle {
  id: string;
  workdir: string;
  createdAt: number;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}
```

### Phase 2: Docker Sandbox (Production)
```typescript
class DockerSandboxClient implements SandboxClient {
  private image: string;
  private networkEnabled: boolean;
  
  async initialize(manifest: Manifest): Promise<SandboxHandle> {
    // Create container from base image
    // Mount workspace volume
    // Clone repos, write files per manifest
    // Return handle with container ID
  }
}
```

### Phase 3: Agent Integration
```typescript
class SandboxAgent {
  constructor(
    private client: SandboxClient,
    private manifest: Manifest,
    private instructions: string
  ) {}
  
  async run(task: string): Promise<AgentResult> {
    const handle = await this.client.initialize(this.manifest);
    
    try {
      // Agent loop: think → act → observe
      while (!this.isComplete()) {
        const action = await this.agent.decide(task, this.getState());
        const result = await this.executeAction(handle, action);
        this.observe(result);
      }
      return this.getResult();
    } finally {
      await this.client.destroy(handle);
    }
  }
}
```

---

## Key Features

### 1. Manifest-Based Initialization
```typescript
const manifest: Manifest = {
  entries: {
    repo: { repo: "owner/repo", ref: "main" },
    files: [
      { path: "/workspace/notes.md", content: "My notes" }
    ],
    env: { NODE_ENV: "development" }
  },
  workspace: "/workspace"
};
```

### 2. State Snapshot & Restore
```typescript
// Save checkpoint mid-task
const snapshot = await sandbox.snapshot(handle);

// Continue later
const newHandle = await sandbox.restore(snapshot);
```

### 3. Parallel Sandboxes
```typescript
// Run multiple tasks in parallel
const tasks = ["Fix bug A", "Add feature B", "Write tests"];
const results = await Promise.all(
  tasks.map(task => sandboxAgent.run(task))
);
```

---

## Differentiators for Meow

1. **Tighter CLI Integration** - Sandboxes work seamlessly with existing Meow CLI tools
2. **Memory Integration** - Sandboxes use Meow's memory system for context
3. **Permission Learning** - Learned patterns apply to sandbox commands
4. **Multi-Agent Ready** - Sandboxes can host sub-agents

---

## Success Metrics

- [ ] Sandbox initializes in < 5 seconds (local)
- [ ] Command execution is isolated (no host contamination)
- [ ] Snapshot/restore works correctly
- [ ] Agent can complete 1-hour task in sandbox
- [ ] Parallel sandbox execution works

---

## Resources

- OpenAI Agents SDK: https://github.com/openai/openai-agents-python
- Deer-Flow Sandbox: https://github.com/bytedance/deer-flow
