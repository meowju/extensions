# Multi-Agent Coordination Architecture

**Priority:** P1 - Competitive (Competitor gap: deer-flow + ruflo have this, Meow doesn't)  
**Created:** 2026-04-26  
**Status:** DISCOVERED

## What deer-flow Does

From `bytedance/deer-flow` analysis (63K stars):

### Hierarchical Agent System
```
Main Agent (Supervisor)
  ├── Research Agent (web search, info gathering)
  ├── Coding Agent (code generation, editing)
  ├── Review Agent (validation, testing)
  └── Memory Agent (store, retrieve knowledge)
```

### Shared Context Store Pattern
- Agents read/write to shared context, not direct messaging
- Supervisor maintains global state
- Agents work in parallel, coordinate via context
- Lazy loading - don't load everything upfront

### Interruptible Execution
- User can interject at any point
- Agent checkpoints for graceful interruption
- Partial results returned on abort

### Skill Chaining
```
Research Agent → produces context → Coding Agent → produces code → Review Agent → validates
```

## What ruflo Does

From `ruvnet/ruflo` analysis (33K stars):

### 16 Specialized Agent Roles
```typescript
type AgentRole = 
  | "coder"       // Code generation and editing
  | "tester"      // Test writing and validation
  | "reviewer"    // Code review and feedback
  | "architect"   // Design and planning
  | "security"   // Security analysis
  | "debugger"   // Bug investigation
  | "documenter" // Documentation generation
  // ... 10 more
```

### Swarm Topologies
```typescript
type SwarmTopology = 
  | "mesh"    // All agents talk to all
  | "hier"    // Supervisor → workers
  | "ring"    // Sequential handoffs
  | "star"    // Central coordinator
```

### Consensus Mechanisms
- Raft-based leader election
- BFT (Byzantine Fault Tolerance) for security
- Gossip protocol for eventual consistency

### Human-Agent Claims
```typescript
interface Claim {
  agent: string;
  action: string;
  status: "pending" | "approved" | "rejected";
  humanReview?: boolean;
}
```

### Learning Loop
```typescript
interface LearningLoop {
  // Track agent decisions and outcomes
  trackDecision(agent, context, outcome);
  
  // Adjust routing based on success rate
  adjustRouting();
  
  // Improve skill selection over time
  updateSkillMetrics();
}
```

## Meow Gap Analysis

Current Meow state:
- ❌ No multi-agent coordination
- ❌ No supervisor/worker hierarchy
- ❌ No shared context store
- ❌ No agent role specialization
- ❌ No consensus mechanisms
- ⚠️ Basic tool execution exists

## Architecture Proposal

### Phase 1: Supervisor Pattern (P1)

```typescript
// agent-kernel/src/multi-agent/supervisor.ts

export class SupervisorAgent {
  private workers: Map<AgentRole, WorkerAgent> = new Map();
  private context: SharedContext;
  
  async orchestrate(task: Task): Promise<Result> {
    // 1. Analyze task requirements
    const requirements = this.analyze(task);
    
    // 2. Select and dispatch workers
    const selectedWorkers = this.selectWorkers(requirements);
    
    // 3. Dispatch in parallel (if independent)
    const results = await Promise.all(
      selectedWorkers.map(w => w.execute(task, this.context))
    );
    
    // 4. Synthesize results
    return this.synthesize(results);
  }
  
  canInterrupt(): boolean {
    // Checkpoint current state
    // Return partial results
    return true;
  }
}
```

### Phase 2: Worker Agent Roles (P1)

```typescript
// agent-kernel/src/multi-agent/worker-roles.ts

export interface WorkerAgent {
  role: AgentRole;
  capabilities: string[];
  execute(task: Task, context: SharedContext): Promise<PartialResult>;
}

// Predefined roles:
export const AGENT_ROLES = {
  CODER: {
    role: "coder",
    capabilities: ["code_generation", "refactoring", "bug_fix"],
    systemPrompt: "You are a coding specialist..."
  },
  TESTER: {
    role: "tester",
    capabilities: ["test_generation", "test_execution", "coverage"],
    systemPrompt: "You are a testing specialist..."
  },
  REVIEWER: {
    role: "reviewer",
    capabilities: ["code_review", "style_check", "security_scan"],
    systemPrompt: "You are a code review specialist..."
  },
  RESEARCHER: {
    role: "researcher",
    capabilities: ["web_search", "documentation", "context_gathering"],
    systemPrompt: "You are a research specialist..."
  }
};
```

### Phase 3: Shared Context Store (P2)

```typescript
// agent-kernel/src/multi-agent/shared-context.ts

export class SharedContext {
  private store: Map<string, any>;
  private listeners: Set<(key: string, value: any) => void>;
  
  set(key: string, value: any): void {
    this.store.set(key, value);
    this.notify(key, value);
  }
  
  get(key: string): any {
    return this.store.get(key);
  }
  
  watch(keyPattern: string, callback: WatchCallback): void {
    // Pattern-based watching
    // Trigger when matching keys change
  }
  
  snapshot(): ContextSnapshot {
    // For checkpoint/interrupt
    return { store: this.store, timestamp: Date.now() };
  }
  
  restore(snapshot: ContextSnapshot): void {
    this.store = snapshot.store;
  }
}
```

### Phase 4: Consensus for Multi-Agent (P2)

```typescript
// agent-kernel/src/multi-agent/consensus.ts

export interface ConsensusConfig {
  type: "raft" | "bft" | "gossip";
  quorum: number;
  timeout: number;
}

export class AgentConsensus {
  async propose(agentId: string, action: AgentAction): Promise<Decision> {
    // Propose action to consensus
    // Wait for quorum
    // Return approved/rejected
  }
  
  async leaderElection(): Promise<string> {
    // Raft-style leader election
    // Return leader agent ID
  }
  
  syncState(): void {
    // Gossip protocol for state sync
    // Eventually consistent
  }
}
```

### Phase 5: Human-in-the-Loop (P3)

```typescript
// agent-kernel/src/multi-agent/claims.ts

export interface Claim {
  id: string;
  agent: AgentRole;
  action: AgentAction;
  justification: string;
  timestamp: number;
  status: "pending" | "approved" | "rejected";
}

export class ClaimManager {
  async submitClaim(claim: Claim): Promise<void> {
    // Store claim
    // Notify human reviewer
    // Await decision
  }
  
  async getPendingClaims(): Promise<Claim[]> {
    // Return all pending claims
  }
  
  async approveClaim(id: string): Promise<void> {
    // Mark approved
    // Unblock agent action
  }
  
  async rejectClaim(id: string, reason: string): Promise<void> {
    // Mark rejected
    // Log reason
    // Unblock agent (to try alternatives)
  }
}
```

## Implementation Roadmap

| Phase | Feature | Priority | Effort | Notes |
|-------|---------|----------|--------|-------|
| 1 | Supervisor Agent | P1 | Medium | Delegate to workers |
| 2 | Worker Roles | P1 | Medium | Coder, Tester, Reviewer, Researcher |
| 3 | Shared Context | P2 | High | Lazy loading, watching |
| 4 | Consensus | P2 | High | Raft/BFT/Gossip |
| 5 | Claims | P3 | Medium | Human-in-the-loop |

## Integration Points

### With Existing Skills System
- Skills can register as agent capabilities
- Supervisor uses skill registry for worker selection
- Skills chain: researcher → coder → reviewer

### With Memory System
- Shared context persists to FTS5
- Cross-session agent coordination
- Skill compounding from multi-agent runs

### With Streaming
- Each worker streams independently
- Supervisor synthesizes multi-stream output
- User sees unified progress indicator

## Copy-Worthy from deer-flow + ruflo

1. **"Agents read/write to shared context, not direct messaging"** - reduces coupling
2. **"Supervisor delegates, doesn't execute"** - separation of concerns
3. **"Lazy loading - don't load everything upfront"** - performance
4. **"Interruptible execution"** - user can interject anytime
5. **"Claims for human approval"** - safety without blocking
6. **"Learning loop adjusts routing"** - self-improving

## Sources
- https://github.com/bytedance/deer-flow (63,672 stars)
- https://github.com/ruvnet/ruflo (33,159 stars)
- https://deerflow.tech (official website)
- https://ruv.io (Ruflo platform)