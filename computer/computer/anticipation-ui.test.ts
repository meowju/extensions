/**
 * anticipation-ui.test.ts
 *
 * Tests for the Anticipation UI module.
 * Verifies:
 * - Preview formatting
 * - Intent detection
 * - Confirmation flow
 * - Progress updates
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { AnticipationUI, createAnticipationUI, detectIntent } from "./anticipation-ui";

describe("AnticipationUI", () => {
  let ui: AnticipationUI;

  beforeEach(() => {
    ui = createAnticipationUI({ channel: "null" }); // Non-interactive for testing
  });

  describe("preview formatting", () => {
    it("formats low-risk steps correctly", async () => {
      const steps = [
        {
          stepNumber: 1,
          action: { tool: "click", target: "Settings" },
          reasoning: "Found Settings button",
          riskLevel: "LOW" as const,
          riskScore: 2,
        },
      ];

      // LOW risk with autoConfirmLowRisk = true → auto-confirms
      const result = await ui.preview(steps);
      expect(result).toBe("proceed"); // Auto-confirmed because all LOW risk
    });

    it("formats mixed-risk steps correctly", async () => {
      const steps = [
        {
          stepNumber: 1,
          action: { tool: "click", target: "Settings" },
          reasoning: "Found Settings button",
          riskLevel: "LOW" as const,
          riskScore: 2,
        },
        {
          stepNumber: 2,
          action: { tool: "click", target: "Delete Account" },
          reasoning: "Destructive action",
          riskLevel: "HIGH" as const,
          riskScore: 8,
        },
      ];

      const result = await ui.preview(steps);
      expect(result).toBe("cancel");
    });

    it("auto-confirms when all LOW risk and autoConfirmLowRisk is true", async () => {
      const uiAuto = createAnticipationUI({ 
        channel: "null", 
        autoConfirmLowRisk: true 
      });

      const steps = [
        {
          stepNumber: 1,
          action: { tool: "click", target: "OK" },
          reasoning: "Safe click",
          riskLevel: "LOW" as const,
          riskScore: 1,
        },
        {
          stepNumber: 2,
          action: { tool: "pressKey", target: "Enter" },
          reasoning: "Safe keypress",
          riskLevel: "LOW" as const,
          riskScore: 1,
        },
      ];

      const result = await uiAuto.preview(steps);
      expect(result).toBe("proceed"); // Auto-confirmed
    });
  });

  describe("update (progress)", () => {
    it("formats executing status", async () => {
      await ui.update({
        step: 1,
        total: 4,
        status: "executing",
        description: "Clicking Settings",
      });
      // Should not throw
    });

    it("formats done status with duration", async () => {
      await ui.update({
        step: 2,
        total: 4,
        status: "done",
        description: "Clicked Settings",
        durationMs: 250,
      });
      // Should not throw
    });

    it("formats failed status with error", async () => {
      await ui.update({
        step: 3,
        total: 4,
        status: "failed",
        description: "Clicking Delete",
        error: "Element not found",
      });
      // Should not throw
    });
  });

  describe("complete (summary)", () => {
    it("formats successful completion", async () => {
      await ui.complete({
        success: true,
        steps: [
          { step: 1, total: 3, status: "done", description: "Click OK", durationMs: 100 },
          { step: 2, total: 3, status: "done", description: "Press Enter", durationMs: 50 },
          { step: 3, total: 3, status: "done", description: "Done", durationMs: 200 },
        ],
        summary: "Task completed successfully",
        changes: ["Clicked OK button", "Pressed Enter"],
      });
      // Should not throw
    });

    it("formats failed completion", async () => {
      await ui.complete({
        success: false,
        steps: [
          { step: 1, total: 3, status: "done", description: "Click OK", durationMs: 100 },
          { step: 2, total: 3, status: "failed", description: "Press Enter", error: "Timeout" },
        ],
        summary: "Task failed at step 2",
      });
      // Should not throw
    });
  });

  describe("error handling", () => {
    it("formats error with context", async () => {
      await ui.error("Element not found", {
        currentStep: 2,
        steps: [
          {
            stepNumber: 1,
            action: { tool: "click", target: "OK" },
            reasoning: "Safe",
            riskLevel: "LOW" as const,
            riskScore: 2,
          },
          {
            stepNumber: 2,
            action: { tool: "click", target: "Delete" },
            reasoning: "Destructive",
            riskLevel: "HIGH" as const,
            riskScore: 8,
          },
        ],
      });
      // Should not throw
    });
  });
});

describe("detectIntent", () => {
  it("parses simple click task", () => {
    const steps = detectIntent("click on Settings");
    expect(steps.length).toBe(1);
    expect(steps[0].action.tool).toBe("click");
    expect(steps[0].action.target).toBe("Settings");
    expect(steps[0].riskLevel).toBe("LOW");
  });

  it("parses delete task as HIGH risk", () => {
    const steps = detectIntent("click Delete Account");
    expect(steps.length).toBe(1);
    expect(steps[0].action.tool).toBe("click");
    expect(steps[0].action.target).toBe("Delete Account");
    expect(steps[0].riskLevel).toBe("HIGH");
    expect(steps[0].riskScore).toBeGreaterThanOrEqual(8);
  });

  it("parses multi-step task", () => {
    const steps = detectIntent("click OK, then press Enter");
    expect(steps.length).toBe(2);
    expect(steps[0].action.tool).toBe("click");
    expect(steps[1].action.tool).toBe("pressKey");
    expect(steps[1].action.target).toBe("Enter");
  });

  it("parses scroll task", () => {
    const steps = detectIntent("scroll down");
    expect(steps.length).toBe(1);
    expect(steps[0].action.tool).toBe("scroll");
    expect(steps[0].action.target).toBe("down");
  });

  it("parses open app task", () => {
    const steps = detectIntent("open Chrome");
    expect(steps.length).toBe(1);
    expect(steps[0].action.tool).toBe("openApp");
    expect(steps[0].action.target).toBe("Chrome");
  });

  it("parses type task", () => {
    const steps = detectIntent('type "hello world"');
    expect(steps.length).toBe(1);
    expect(steps[0].action.tool).toBe("type");
    expect(steps[0].action.target).toBe("hello world");
  });

  it("parses destructive submit as MEDIUM risk", () => {
    const steps = detectIntent("click Submit Order");
    expect(steps.length).toBe(1);
    expect(steps[0].riskLevel).toBe("MEDIUM");
    expect(steps[0].riskScore).toBeGreaterThanOrEqual(5);
  });

  it("assigns step numbers correctly", () => {
    const steps = detectIntent("click A, and click B, then click C");
    expect(steps.length).toBe(3);
    expect(steps[0].stepNumber).toBe(1);
    expect(steps[1].stepNumber).toBe(2);
    expect(steps[2].stepNumber).toBe(3);
  });

  it("generates reasoning for each step", () => {
    const steps = detectIntent("click Submit");
    expect(steps[0].reasoning).toContain("Submit");
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("AnticipationUI integration with detectIntent", () => {
  let ui: AnticipationUI;

  beforeEach(() => {
    ui = createAnticipationUI({ channel: "null" });
  });

  it("full flow: detect → preview → complete", async () => {
    const task = "click Settings, then click Delete Account button";
    
    // Step 1: Detect intent
    const steps = detectIntent(task);
    expect(steps.length).toBe(2);
    
    // Step 2: Preview (non-interactive mode with MEDIUM/HIGH risk = cancel)
    // Note: With channel="null" and autoConfirmLowRisk=true, HIGH risk returns cancel
    const confirmation = await ui.preview(steps);
    expect(confirmation).toBe("cancel");
    
    // Step 3: If confirmed, execute (skipped in test)
    // Step 4: Complete
    await ui.complete({
      success: false,
      steps: steps.map((s, i) => ({
        step: i + 1,
        total: steps.length,
        status: "pending" as const,
        description: `${s.action.tool} → ${s.action.target}`,
      })),
      summary: "Cancelled by user",
    });

    expect(ui.getLastConfirmation()).toBe("cancel");
  });

  it("handles HIGH risk items with proper formatting", async () => {
    const steps = detectIntent("click Remove Everything");
    
    // Verify risk level
    expect(steps[0].riskLevel).toBe("HIGH");
    expect(steps[0].riskScore).toBeGreaterThanOrEqual(8);
    
    // Preview should include risk indicator
    const confirmation = await ui.preview(steps);
    expect(confirmation).toBe("cancel");
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe("AnticipationUI performance", () => {
  it("handles large step lists without delay", async () => {
    const ui = createAnticipationUI({ channel: "null" });
    const steps = Array.from({ length: 20 }, (_, i) => ({
      stepNumber: i + 1,
      action: { tool: "click", target: `Button ${i + 1}` },
      reasoning: `Click button ${i + 1}`,
      riskLevel: "LOW" as const,
      riskScore: 1,
    }));

    const start = Date.now();
    await ui.preview(steps);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000); // Should complete quickly
  });
});