/**
 * supervisor-agent.ts - Multi-Agent Supervisor (deer-flow pattern)
 *
 * SupervisorAgent decomposes complex tasks into subtasks,
 * dispatches to specialized sub-agents (Researcher, Coder, Reviewer),
 * and aggregates results into coherent responses.
 *
 * Pattern: Supervisor (73K+24K stars from deer-flow + ruflo)
 */

import { runLeanAgent, type AgentResult } from "../../../kernel/src/core/lean-agent.ts";

// ============================================================================
// Types
// ============================================================================

export interface SubTask {
  id: string;
  type: "research" | "code" | "review" | "general";
  description: string;
  priority: number;
  dependencies: string[]; // SubTask IDs that must complete first
  result?: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface SupervisorOptions {
  maxParallelAgents?: number;
  timeoutMs?: number;
  onSubAgentStart?: (task: SubTask) => void;
  onSubAgentComplete?: (task: SubTask, result: string) => void;
  onSupervisorProgress?: (phase: string, progress: number) => void;
}

export interface SupervisorResult {
  success: boolean;
  finalResponse: string;
  subtasks: SubTask[];
  totalIterations: number;
  errors: string[];
}

// ============================================================================
// SubAgent Types
// ============================================================================

export type SubAgentType = "research" | "code" | "review";

interface SubAgentResponse {
  success: boolean;
  content: string;
  agentResult?: AgentResult;
}

// ============================================================================
// SupervisorAgent Implementation
// ============================================================================

export class SupervisorAgent {
  private maxParallelAgents: number;
  private timeoutMs: number;
  private onSubAgentStart?: (task: SubTask) => void;
  private onSubAgentComplete?: (task: SubTask, result: string) => void;
  private onSupervisorProgress?: (phase: string, progress: number) => void;

  constructor(options: SupervisorOptions = {}) {
    this.maxParallelAgents = options.maxParallelAgents ?? 3;
    this.timeoutMs = options.timeoutMs ?? 600000; // 10 min default
    this.onSubAgentStart = options.onSubAgentStart;
    this.onSubAgentComplete = options.onSubAgentComplete;
    this.onSupervisorProgress = options.onSupervisorProgress;
  }

  /**
   * Main supervisor loop - handles complex tasks via sub-agents
   */
  async run(prompt: string, options: SupervisorOptions = {}): Promise<SupervisorResult> {
    console.log(`[SupervisorAgent] Starting supervisor loop for: ${prompt.slice(0, 80)}...`);
    
    const errors: string[] = [];
    let subtasks: SubTask[] = [];
    let totalIterations = 0;

    try {
      // Phase 1: DISCOVER - Decompose task into subtasks
      this.onSupervisorProgress?.("DISCOVER", 0);
      console.log(`[SupervisorAgent] Phase 1: DISCOVER - Task decomposition`);
      
      subtasks = await this.decomposeTask(prompt);
      console.log(`[SupervisorAgent] Decomposed into ${subtasks.length} subtasks`);
      
      this.onSupervisorProgress?.("DISCOVER", 100);

      // Phase 2: PLAN - Determine execution order and dependencies
      this.onSupervisorProgress?.("PLAN", 0);
      console.log(`[SupervisorAgent] Phase 2: PLAN - Execution ordering`);
      
      subtasks = this.orderSubtasks(subtasks);
      
      this.onSupervisorProgress?.("PLAN", 100);

      // Phase 3: BUILD - Dispatch and execute subtasks
      this.onSupervisorProgress?.("BUILD", 0);
      console.log(`[SupervisorAgent] Phase 3: BUILD - Sub-agent execution`);
      
      const results = await this.executeSubtasks(subtasks);
      
      // Update subtasks with results
      for (const result of results) {
        const task = subtasks.find(t => t.id === result.taskId);
        if (task) {
          task.result = result.content;
          task.status = result.success ? "completed" : "failed";
          if (!result.success) {
            errors.push(`Task ${task.id} (${task.type}): ${result.error || "Unknown error"}`);
          }
        }
        totalIterations += result.iterations || 0;
      }

      this.onSupervisorProgress?.("BUILD", 100);

      // Phase 4: DOGFOOD - Aggregate and finalize
      this.onSupervisorProgress?.("DOGFOOD", 0);
      console.log(`[SupervisorAgent] Phase 4: DOGFOOD - Result aggregation`);
      
      const finalResponse = await this.aggregateResults(prompt, subtasks);
      
      this.onSupervisorProgress?.("DOGFOOD", 100);

      return {
        success: errors.length === 0,
        finalResponse,
        subtasks,
        totalIterations,
        errors,
      };

    } catch (e: any) {
      console.error(`[SupervisorAgent] Supervisor loop failed:`, e.message);
      errors.push(e.message);
      
      return {
        success: false,
        finalResponse: `Supervisor failed: ${e.message}`,
        subtasks,
        totalIterations,
        errors,
      };
    }
  }

  /**
   * Phase 1: DISCOVER - Decompose user prompt into subtasks
   */
  private async decomposeTask(prompt: string): Promise<SubTask[]> {
    const systemPrompt = `You are a Task Decomposer for a multi-agent system.

Given a user prompt, break it down into subtasks that can be handled by specialized sub-agents.

Sub-agent types:
- "research": Web search, document analysis, capability research
- "code": Code generation, modification, implementation
- "review": Code review, quality assessment, test validation

Rules:
1. Each subtask should be actionable and have clear success criteria
2. Consider dependencies - what must complete before other tasks can start
3. Keep subtasks focused - one primary objective per subtask
4. Prioritize: higher priority tasks should execute first

Output format - JSON array of subtasks:
[
  {
    "id": "task-1",
    "type": "research|code|review|general",
    "description": "What this task should accomplish",
    "priority": 1-10,
    "dependencies": ["task-id"] // empty if no dependencies
  }
]

User prompt: ${prompt}

Respond ONLY with the JSON array, no additional text.`;

    try {
      const result = await runLeanAgent(
        "Decompose this task into subtasks for specialized agents.",
        {
          systemPrompt,
          maxIterations: 20,
          timeoutMs: this.timeoutMs,
          dangerous: true,
        }
      );

      // Parse subtasks from result
      const content = result.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((t: any, i: number) => ({
          id: t.id || `task-${i + 1}`,
          type: t.type || "general",
          description: t.description || t.name || "",
          priority: t.priority || 5,
          dependencies: t.dependencies || [],
          status: "pending" as const,
        }));
      }

      // Fallback: create a single general task
      console.warn(`[SupervisorAgent] Could not parse subtasks, using fallback`);
      return [{
        id: "task-1",
        type: "general",
        description: prompt,
        priority: 5,
        dependencies: [],
        status: "pending",
      }];

    } catch (e: any) {
      console.error(`[SupervisorAgent] Task decomposition failed:`, e.message);
      // Fallback to single task
      return [{
        id: "task-1",
        type: "general",
        description: prompt,
        priority: 5,
        dependencies: [],
        status: "pending",
      }];
    }
  }

  /**
   * Phase 2: PLAN - Order subtasks by priority and dependencies
   */
  private orderSubtasks(subtasks: SubTask[]): SubTask[] {
    // Sort by priority (higher first)
    const sorted = [...subtasks].sort((a, b) => b.priority - a.priority);

    // Topological sort respecting dependencies
    const ordered: SubTask[] = [];
    const remaining = new Set(subtasks.map(t => t.id));

    const canExecute = (task: SubTask): boolean => {
      return task.dependencies.every(depId => 
        ordered.some(t => t.id === depId)
      );
    };

    let iterations = 0;
    const maxIterations = subtasks.length * 2;

    while (remaining.size > 0 && iterations < maxIterations) {
      iterations++;
      let progress = false;

      for (const taskId of remaining) {
        const task = sorted.find(t => t.id === taskId);
        if (task && canExecute(task)) {
          ordered.push(task);
          remaining.delete(taskId);
          progress = true;
        }
      }

      if (!progress && remaining.size > 0) {
        // Circular dependency or other issue - add remaining in priority order
        for (const taskId of remaining) {
          const task = sorted.find(t => t.id === taskId);
          if (task) ordered.push(task);
        }
        break;
      }
    }

    return ordered;
  }

  /**
   * Phase 3: BUILD - Execute subtasks via sub-agents
   */
  private async executeSubtasks(subtasks: SubTask[]): Promise<Array<{
    taskId: string;
    success: boolean;
    content: string;
    iterations: number;
    error?: string;
  }>> {
    const results: Array<{
      taskId: string;
      success: boolean;
      content: string;
      iterations: number;
      error?: string;
    }> = [];

    // Execute in batches based on maxParallelAgents
    for (let i = 0; i < subtasks.length; i += this.maxParallelAgents) {
      const batch = subtasks.slice(i, i + this.maxParallelAgents);
      const batchPromises = batch.map(task => this.executeSubTask(task));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Execute a single subtask via appropriate sub-agent
   */
  private async executeSubTask(task: SubTask): Promise<{
    taskId: string;
    success: boolean;
    content: string;
    iterations: number;
    error?: string;
  }> {
    console.log(`[SupervisorAgent] Executing task: ${task.id} (${task.type})`);
    
    task.status = "running";
    this.onSubAgentStart?.(task);

    try {
      let response: SubAgentResponse;

      switch (task.type) {
        case "research":
          response = await this.runResearchAgent(task.description);
          break;
        case "code":
          response = await this.runCoderAgent(task.description);
          break;
        case "review":
          response = await this.runReviewerAgent(task.description);
          break;
        default:
          response = await this.runGeneralAgent(task.description);
      }

      this.onSubAgentComplete?.(task, response.content);

      return {
        taskId: task.id,
        success: response.success,
        content: response.content,
        iterations: response.agentResult?.iterations || 1,
      };

    } catch (e: any) {
      console.error(`[SupervisorAgent] Task ${task.id} failed:`, e.message);
      task.status = "failed";
      
      return {
        taskId: task.id,
        success: false,
        content: "",
        iterations: 0,
        error: e.message,
      };
    }
  }

  /**
   * Research SubAgent - web search and document analysis
   */
  private async runResearchAgent(taskDescription: string): Promise<SubAgentResponse> {
    const systemPrompt = `You are a Research SubAgent.

Your role is to:
- Search the web for relevant information
- Analyze documents and technical specifications
- Identify capability gaps and best practices
- Provide structured research findings

Task: ${taskDescription}

Provide a structured research report with:
1. Key findings
2. Relevant patterns or approaches
3. Recommendations
4. References (URLs if found)`;

    try {
      const result = await runLeanAgent(taskDescription, {
        systemPrompt,
        maxIterations: 30,
        timeoutMs: this.timeoutMs,
        dangerous: true,
      });

      return {
        success: true,
        content: result.content,
        agentResult: result,
      };
    } catch (e: any) {
      return {
        success: false,
        content: "",
        agentResult: undefined,
      };
    }
  }

  /**
   * Coder SubAgent - code generation and modification
   */
  private async runCoderAgent(taskDescription: string): Promise<SubAgentResponse> {
    const systemPrompt = `You are a Coder SubAgent.

Your role is to:
- Generate code based on requirements
- Modify existing code to implement changes
- Ensure code follows best practices
- Write tests for generated code

Task: ${taskDescription}

Provide:
1. The code implementation
2. Explanation of key decisions
3. Any tests written`;

    try {
      const result = await runLeanAgent(taskDescription, {
        systemPrompt,
        maxIterations: 40,
        timeoutMs: this.timeoutMs,
        dangerous: true,
      });

      return {
        success: true,
        content: result.content,
        agentResult: result,
      };
    } catch (e: any) {
      return {
        success: false,
        content: "",
        agentResult: undefined,
      };
    }
  }

  /**
   * Reviewer SubAgent - code review and quality assessment
   */
  private async runReviewerAgent(taskDescription: string): Promise<SubAgentResponse> {
    const systemPrompt = `You are a Reviewer SubAgent.

Your role is to:
- Review code for quality and correctness
- Identify potential bugs or issues
- Suggest improvements
- Validate test coverage

Task: ${taskDescription}

Provide a structured review with:
1. Overall assessment
2. Issues found (if any)
3. Suggestions for improvement
4. Approval/rejection recommendation`;

    try {
      const result = await runLeanAgent(taskDescription, {
        systemPrompt,
        maxIterations: 25,
        timeoutMs: this.timeoutMs,
        dangerous: true,
      });

      return {
        success: true,
        content: result.content,
        agentResult: result,
      };
    } catch (e: any) {
      return {
        success: false,
        content: "",
        agentResult: undefined,
      };
    }
  }

  /**
   * General SubAgent - handles tasks that don't fit other categories
   */
  private async runGeneralAgent(taskDescription: string): Promise<SubAgentResponse> {
    try {
      const result = await runLeanAgent(taskDescription, {
        maxIterations: 30,
        timeoutMs: this.timeoutMs,
        dangerous: true,
      });

      return {
        success: true,
        content: result.content,
        agentResult: result,
      };
    } catch (e: any) {
      return {
        success: false,
        content: "",
        agentResult: undefined,
      };
    }
  }

  /**
   * Phase 4: DOGFOOD - Aggregate results into final response
   */
  private async aggregateResults(originalPrompt: string, subtasks: SubTask[]): Promise<string> {
    const completedTasks = subtasks.filter(t => t.status === "completed" && t.result);
    const failedTasks = subtasks.filter(t => t.status === "failed");

    const taskSummary = subtasks.map(t => {
      const status = t.status === "completed" ? "✅" : t.status === "failed" ? "❌" : "⏳";
      return `${status} [${t.type}] ${t.description.slice(0, 60)}...`;
    }).join("\n");

    const systemPrompt = `You are an Aggregation Agent for a multi-agent supervisor.

The original user prompt was: ${originalPrompt}

Sub-agent results:
${completedTasks.map(t => `### ${t.type.toUpperCase()} (${t.id})
${t.result}
`).join("\n")}

${failedTasks.length > 0 ? `Failed tasks:
${failedTasks.map(t => `- ${t.id}: ${t.description}`).join("\n")}
` : ""}

Task summary:
${taskSummary}

Your job is to:
1. Synthesize all sub-agent results into a coherent response
2. Address the original user prompt completely
3. Highlight key findings and recommendations
4. If there were failures, acknowledge them and suggest workarounds

Provide a final, polished response to the user.`;

    try {
      const result = await runLeanAgent(
        "Aggregate sub-agent results into final response.",
        {
          systemPrompt,
          maxIterations: 15,
          timeoutMs: this.timeoutMs,
          dangerous: true,
        }
      );

      return result.content;
    } catch (e: any) {
      // Fallback - just return a summary
      return `Multi-agent processing completed.

Results from ${completedTasks.length}/${subtasks.length} tasks:

${completedTasks.map(t => `### ${t.type.toUpperCase()}: ${t.description.slice(0, 50)}...
${t.result?.slice(0, 500)}...`).join("\n\n")}

${failedTasks.length > 0 ? `\n⚠️ ${failedTasks.length} task(s) failed:\n${failedTasks.map(t => `- ${t.id}: ${t.description}`).join("\n")}` : ""}`;
    }
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (import.meta.main) {
  const args = process.argv.slice(2);
  const prompt = args.filter(a => !a.startsWith("--")).join(" ") || "Hello world";

  console.log(`[SupervisorAgent] Starting supervisor with prompt: ${prompt.slice(0, 80)}...`);

  const supervisor = new SupervisorAgent({
    onSubAgentStart: (task) => {
      console.log(`  → Starting ${task.type} agent: ${task.id}`);
    },
    onSubAgentComplete: (task, result) => {
      console.log(`  ✓ Completed ${task.id} (${task.type}): ${result.slice(0, 60)}...`);
    },
    onSupervisorProgress: (phase, progress) => {
      console.log(`  [${phase}] ${progress}%`);
    },
  });

  supervisor.run(prompt).then(result => {
    console.log(`\n[SupervisorAgent] Final result (${result.subtasks.length} subtasks):`);
    console.log(result.finalResponse.slice(0, 500));
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️ Errors encountered:`);
      result.errors.forEach(e => console.log(`  - ${e}`));
    }

    process.exit(result.success ? 0 : 1);
  }).catch(e => {
    console.error(`[SupervisorAgent] Fatal error:`, e);
    process.exit(1);
  });
}

export default SupervisorAgent;