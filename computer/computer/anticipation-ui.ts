/**
 * anticipation-ui.ts
 *
 * Anticipation UI Layer for the Desktop Agent.
 * Shows what the agent plans to do BEFORE executing any action.
 *
 * This is the "magic moment" - user sees intent before it becomes action.
 *
 * Architecture:
 * - preview() shows planned steps with reasoning and risk
 * - update() communicates progress during execution
 * - complete() summarizes what happened
 * - setChannel() switches between stdout, Discord, or custom
 *
 * Usage:
 *   const ui = new AnticipationUI();
 *   ui.setChannel("stdout");
 *   await ui.preview(steps);
 *   // ... user confirms ...
 *   await ui.update(1, 4, "executing");
 *   // ... execute step ...
 *   await ui.complete(result);
 */

// ============================================================================
// Types
// ============================================================================

export interface IntentStep {
  stepNumber: number;
  action: {
    tool: string;
    target?: string;
    details?: string;
  };
  reasoning: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskScore: number;
  confidence?: number;
}

export interface StepStatus {
  step: number;
  total: number;
  status: "pending" | "executing" | "verifying" | "done" | "failed";
  description: string;
  durationMs?: number;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  steps: StepStatus[];
  summary: string;
  changes?: string[];
}

export type Confirmation = "proceed" | "modify" | "cancel";
export type Channel = "stdout" | "discord" | "null";

export interface AnticipationUIConfig {
  channel: Channel;
  autoConfirmLowRisk: boolean;
  timeoutMs: number;
  discordMessageId?: string;
  discordChannelId?: string;
}

// ============================================================================
// AnticipationUI
// ============================================================================

export class AnticipationUI {
  private config: AnticipationUIConfig;
  private pendingSteps: IntentStep[] = [];
  private lastConfirmed: Confirmation = "cancel";

  constructor(config: Partial<AnticipationUIConfig> = {}) {
    this.config = {
      channel: "stdout",
      autoConfirmLowRisk: true,
      timeoutMs: 120000,
      ...config,
    };
  }

  setChannel(channel: Channel): void {
    this.config.channel = channel;
  }

  setDiscordContext(messageId: string, channelId: string): void {
    this.config.discordMessageId = messageId;
    this.config.discordChannelId = channelId;
  }

  // ---------------------------------------------------------------------------
  // Preview: Show intent before execution
  // ---------------------------------------------------------------------------

  /**
   * preview(steps) — show the agent's plan and wait for user confirmation.
   *
   * Shows:
   * - Numbered steps with descriptions
   * - Reasoning for each step
   * - Risk level badge per step
   * - Confidence (if element targeting)
   *
   * Returns:
   *   "proceed" — user approved the plan
   *   "modify" — user wants to modify the plan
   *   "cancel" — user cancelled
   */
  async preview(steps: IntentStep[]): Promise<Confirmation> {
    this.pendingSteps = steps;

    // Format and display
    const formatted = this.formatPreview(steps);
    await this.send(formatted);

    // Auto-confirm low-risk plans if configured
    if (this.config.autoConfirmLowRisk && steps.every(s => s.riskLevel === "LOW")) {
      console.log("\n[anticipation] 🟢 All steps are LOW risk — auto-confirming...\n");
      this.lastConfirmed = "proceed";
      return "proceed";
    }

    // Wait for user input
    return this.waitForConfirmation(steps);
  }

  private formatPreview(steps: IntentStep[]): string {
    const lines: string[] = [];

    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("📋  ANTICIPATION PREVIEW — What I'm about to do:");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("");

    for (const step of steps) {
      const riskIcon = step.riskLevel === "HIGH" ? "🔴" : step.riskLevel === "MEDIUM" ? "🟡" : "🟢";
      const riskBadge = `[${riskIcon} ${step.riskLevel}]`;

      lines.push(`  Step ${step.stepNumber}: ${riskBadge}`);
      lines.push(`    Action: ${step.action.tool}${step.action.target ? ` → "${step.action.target}"` : ""}`);

      if (step.reasoning) {
        lines.push(`    Reasoning: ${step.reasoning}`);
      }

      if (step.confidence !== undefined) {
        lines.push(`    Confidence: ${Math.round(step.confidence * 100)}%`);
      }

      lines.push("");
    }

    lines.push("──────────────────────────────────────────────────────");
    lines.push("  Options:");
    lines.push("    [y] Proceed with this plan");
    lines.push("    [m] Modify the plan");
    lines.push("    [n] Cancel / Stop");
    lines.push("    [1-" + steps.length + "] Proceed up to step N only");
    lines.push("──────────────────────────────────────────────────────");
    lines.push("");

    return lines.join("\n");
  }

  private async waitForConfirmation(steps: IntentStep[]): Promise<Confirmation> {
    if (this.config.channel === "null") {
      // Non-interactive mode: auto-deny
      return "cancel";
    }

    // Use dynamic import for readline (Bun compatibility)
    try {
      const { createInterface } = await import("node:readline/promises");
      const { stdin, stdout } = await import("node:process");
      const rl = createInterface({ input: stdin, output: stdout });
      
      try {
        const input = await rl.question("Your choice (y/m/n/[step]): ");
        const trimmed = input.trim().toLowerCase();

        if (trimmed === "y" || trimmed === "yes" || trimmed === "proceed" || trimmed === "") {
          this.lastConfirmed = "proceed";
          return "proceed";
        }

        if (trimmed === "m" || trimmed === "modify" || trimmed === "edit") {
          this.lastConfirmed = "modify";
          return "modify";
        }

        if (trimmed === "n" || trimmed === "no" || trimmed === "cancel" || trimmed === "stop") {
          this.lastConfirmed = "cancel";
          return "cancel";
        }

        // Check for step number (e.g., "2" = proceed up to step 2 only)
        const stepNum = parseInt(trimmed, 10);
        if (!isNaN(stepNum) && stepNum >= 1 && stepNum <= steps.length) {
          console.log(`\n[anticipation] Proceeding with steps 1-${stepNum} only.\n`);
          this.lastConfirmed = "proceed";
          return "proceed";
        }

        // Invalid input, retry
        console.log("Invalid input. Please try again.\n");
        return this.waitForConfirmation(steps);

      } finally {
        rl.close();
      }
    } catch (e) {
      // Fallback: non-interactive
      return "cancel";
    }
  }

  // ---------------------------------------------------------------------------
  // Update: Show progress during execution
  // ---------------------------------------------------------------------------

  /**
   * update(status) — show current execution status.
   *
   * States:
   * - pending: step is queued but not started
   * - executing: step is in progress
   * - verifying: step completed, checking result
   * - done: step finished successfully
   * - failed: step encountered an error
   */
  async update(status: StepStatus): Promise<void> {
    const { step, total, status: s, description, durationMs, error } = status;

    const icon = s === "executing" ? "⚡" :
                 s === "verifying" ? "🔍" :
                 s === "done" ? "✅" :
                 s === "failed" ? "❌" : "⏳";

    const progressBar = this.makeProgressBar(step, total);

    const lines: string[] = [];
    lines.push(`${icon} Step ${step}/${total}: ${progressBar}`);
    lines.push(`   ${description}`);

    if (durationMs !== undefined) {
      lines.push(`   Duration: ${durationMs}ms`);
    }

    if (error) {
      lines.push(`   ❗ Error: ${error}`);
    }

    if (s === "executing") {
      lines.push("\n   Working...");
    }

    await this.send(lines.join("\n"));
  }

  private makeProgressBar(current: number, total: number): string {
    const width = 20;
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    return `[${bar}] ${current}/${total}`;
  }

  // ---------------------------------------------------------------------------
  // Complete: Show final summary
  // ---------------------------------------------------------------------------

  /**
   * complete(result) — show execution summary.
   */
  async complete(result: ExecutionResult): Promise<void> {
    const lines: string[] = [];

    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push(result.success ? "✅  COMPLETE" : "⚠️  FINISHED WITH ISSUES");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("");

    lines.push(`  Summary: ${result.summary}`);
    lines.push("");

    if (result.changes && result.changes.length > 0) {
      lines.push("  Changes made:");
      for (const change of result.changes) {
        lines.push(`    • ${change}`);
      }
      lines.push("");
    }

    lines.push("  Step results:");
    for (const step of result.steps) {
      const icon = step.status === "done" ? "✅" :
                   step.status === "failed" ? "❌" :
                   step.status === "executing" ? "⚡" :
                   step.status === "verifying" ? "🔍" : "⏳";
      lines.push(`    ${icon} Step ${step.step}: ${step.description}`);
      if (step.error) {
        lines.push(`       Error: ${step.error}`);
      }
      if (step.durationMs) {
        lines.push(`       Duration: ${step.durationMs}ms`);
      }
    }

    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    await this.send(lines.join("\n"));
  }

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  /**
   * error(message, context?) — show error and recovery options.
   */
  async error(message: string, context?: { steps?: IntentStep[]; currentStep?: number }): Promise<void> {
    const lines: string[] = [];

    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("❌  ERROR");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push(`  ${message}`);
    lines.push("");

    if (context?.currentStep !== undefined) {
      lines.push(`  Failed at step ${context.currentStep}`);
      if (context.steps && context.steps[context.currentStep - 1]) {
        const failedStep = context.steps[context.currentStep - 1];
        lines.push(`  Action: ${failedStep.action.tool} → ${failedStep.action.target ?? "unknown"}`);
        lines.push(`  Reasoning: ${failedStep.reasoning}`);
      }
      lines.push("");
    }

    lines.push("  Recovery options:");
    lines.push("    [r] Retry the failed step");
    lines.push("    [s] Skip to next step");
    lines.push("    [c] Cancel the remaining plan");
    lines.push("──────────────────────────────────────────────────────");

    await this.send(lines.join("\n"));
  }

  async recoveryPrompt(): Promise<"retry" | "skip" | "cancel"> {
    if (this.config.channel === "null") return "cancel";

    try {
      const { createInterface } = await import("node:readline/promises");
      const { stdin, stdout } = await import("node:process");
      const rl = createInterface({ input: stdin, output: stdout });
      
      try {
        const input = await rl.question("\nYour choice (r/s/c): ");
        const trimmed = input.trim().toLowerCase();

        if (trimmed === "r" || trimmed === "retry") return "retry";
        if (trimmed === "s" || trimmed === "skip") return "skip";
        return "cancel";
      } finally {
        rl.close();
      }
    } catch (e) {
      return "cancel";
    }
  }

  // ---------------------------------------------------------------------------
  // Channel sending
  // ---------------------------------------------------------------------------

  private async send(content: string): Promise<void> {
    if (this.config.channel === "null") return;

    if (this.config.channel === "stdout") {
      console.log(content);
    } else if (this.config.channel === "discord") {
      // Discord integration would send via Discord API
      // For now, fall back to stdout
      console.log(content);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  getPendingSteps(): IntentStep[] {
    return [...this.pendingSteps];
  }

  getLastConfirmation(): Confirmation {
    return this.lastConfirmed;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * createAnticipationUI(config?) — create a configured AnticipationUI instance.
 */
export function createAnticipationUI(config?: Partial<AnticipationUIConfig>): AnticipationUI {
  return new AnticipationUI(config);
}

// ============================================================================
// Pre-built Intent Detection (for common scenarios)
// ============================================================================

/**
 * detectIntent(task, screenContext?) — parse natural language task into IntentStep[].
 *
 * This is a simple rule-based parser. In production, this would use an LLM.
 */
export function detectIntent(task: string, _screenContext?: { elements?: string[] }): IntentStep[] {
  const steps: IntentStep[] = [];

  // Parse task into segments
  const segments = task
    .replace(/,\s+then\s+/gi, " | ")
    .replace(/,\s+and\s+/gi, " | ")
    .split(" | ")
    .map(s => s.trim())
    .filter(Boolean);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    let tool = "unknown";
    let target = "";
    let reasoning = "";
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    let riskScore = 2;

    // Action type detection
    if (/click\s+(on\s+)?['"]?(.+?)['"]?\s*(?:button)?$/i.test(seg)) {
      const match = seg.match(/click\s+(?:on\s+)?['"]?(.+?)['"]?\s*(?:button)?$/i);
      tool = "click";
      target = (match?.[1] ?? "").trim();
      reasoning = `User requested click on "${target}"`;

      // Risk assessment
      if (/delete|remove|destroy|drop|trash/i.test(target)) {
        riskLevel = "HIGH";
        riskScore = 8;
        reasoning += " (destructive action)";
      } else if (/submit|send|confirm|approve|agree/i.test(target)) {
        riskLevel = "MEDIUM";
        riskScore = 5;
        reasoning += " (commits a change)";
      }
    } else if (/type\s+(in\s+)?['"](.+)['"]/i.test(seg)) {
      const match = seg.match(/type\s+(in\s+)?['"](.+)['"]/i);
      tool = "type";
      target = match?.[2] ?? "";
      reasoning = `User requested to type: "${target}"`;
    } else if (/press\s+(enter|tab|escape|space)/i.test(seg)) {
      const match = seg.match(/press\s+(enter|tab|escape|space)/i);
      tool = "pressKey";
      target = match?.[1] ?? "";
      reasoning = `User requested key press: ${target}`;
    } else if (/scroll\s+(up|down)/i.test(seg)) {
      const match = seg.match(/scroll\s+(up|down)/i);
      tool = "scroll";
      target = match?.[1] ?? "";
      reasoning = `User requested scroll ${target}`;
    } else if (/open\s+(app\s+)?(.+)/i.test(seg)) {
      const match = seg.match(/open\s+(app\s+)?(.+)/i);
      tool = "openApp";
      target = match?.[2] ?? "";
      reasoning = `User requested to open: ${target}`;
    } else if (/screenshot|capture\s+screen/i.test(seg.toLowerCase())) {
      tool = "screenshot";
      reasoning = "User requested screen capture";
    } else {
      // Default: treat as a click on the text
      tool = "click";
      target = seg;
      reasoning = `User requested action: "${seg}"`;
    }

    steps.push({
      stepNumber: i + 1,
      action: { tool, target },
      reasoning,
      riskLevel,
      riskScore,
    });
  }

  return steps;
}

// ============================================================================
// Quick Demo (run with: bun run anticipation-ui.ts)
// ============================================================================

async function demo() {
  console.log("\n🎯 ANTICIPATION UI DEMO\n");
  console.log("Scenario: User wants to delete their account\n");

  const ui = createAnticipationUI({ channel: "stdout" });

  const steps: IntentStep[] = [
    {
      stepNumber: 1,
      action: { tool: "click", target: "Settings" },
      reasoning: 'Navigate to settings page - found "Settings" button at (120, 340) with 96% confidence',
      riskLevel: "LOW",
      riskScore: 2,
      confidence: 0.96,
    },
    {
      stepNumber: 2,
      action: { tool: "scroll", target: "down" },
      reasoning: "Scroll down to find account deletion section",
      riskLevel: "LOW",
      riskScore: 1,
    },
    {
      stepNumber: 3,
      action: { tool: "click", target: "Delete Account" },
      reasoning: "Found account deletion button - this is a destructive action",
      riskLevel: "HIGH",
      riskScore: 8,
      confidence: 0.94,
    },
    {
      stepNumber: 4,
      action: { tool: "pressKey", target: "Enter" },
      reasoning: "Confirm the deletion by pressing Enter",
      riskLevel: "MEDIUM",
      riskScore: 6,
    },
  ];

  // Show preview
  const confirmation = await ui.preview(steps);
  console.log(`\nUser chose: ${confirmation}\n`);

  if (confirmation === "proceed") {
    // Simulate execution
    for (let i = 0; i < steps.length; i++) {
      await ui.update({
        step: i + 1,
        total: steps.length,
        status: "executing",
        description: `Executing: ${steps[i].action.tool} → ${steps[i].action.target}`,
        durationMs: Math.floor(Math.random() * 500) + 100,
      });
      await new Promise(resolve => setTimeout(resolve, 300));

      await ui.update({
        step: i + 1,
        total: steps.length,
        status: "verifying",
        description: "Verifying action result...",
      });
      await new Promise(resolve => setTimeout(resolve, 200));

      await ui.update({
        step: i + 1,
        total: steps.length,
        status: "done",
        description: "Completed",
      });
    }

    await ui.complete({
      success: true,
      steps: steps.map((s, i) => ({
        step: i + 1,
        total: steps.length,
        status: "done" as const,
        description: `${s.action.tool} → ${s.action.target}`,
        durationMs: Math.floor(Math.random() * 500) + 100,
      })),
      summary: "Account deletion completed successfully",
      changes: [
        "Account settings page opened",
        "Scrolled to account section",
        "Delete Account button clicked",
        "Deletion confirmed with Enter key",
      ],
    });
  }
}

// Run demo if executed directly
if (import.meta.main) {
  demo().catch(console.error);
}