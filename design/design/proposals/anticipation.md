=== Design Proposal: Anticipation UI — Show Before Doing ===

Date: 2026-04-24
Feature: ANTICIPATION-MOMENT
Status: PROTOTYPE READY

== Problem Statement ==

Users feel anxious when AI agents act without warning. They don't know what the agent is about to do, so they can't course-correct before damage is done. The magic moment is **before the action**, not after.

Current flow:
```
User: "click the delete button"
  → Agent parses task
  → Agent executes steps immediately
  → User sees result (too late if wrong)
```

Better flow:
```
User: "click the delete button"
  → Agent parses task into steps
  → Agent shows: "I plan to: Click [Delete Account] button"
  → Agent shows reasoning: "Found button at (450, 320) with 94% confidence"
  → User can approve/modify/cancel BEFORE any action
```

== Research ==

### What Cursor Does
- Shows "Agent is thinking..." while planning
- Displays a "Plan" preview with numbered steps
- User sees the full plan before any file edits happen
- Has a "Apply" button to confirm all changes

### What Claude Code Does  
- Shows "I'm going to..." before each tool use
- Lists specific files to be modified
- Shows diff preview before applying
- User can say "no" at any point

### What Windsurf Does
- Cascade architecture shows reasoning chain
- Each step labeled: "Observe → Think → Act"
- Progress indicator with step X of Y

### What Builder.io Does
- Component preview before generation
- "Review" mode shows what will be created
- User can iterate on the plan before execution

### Common Pattern: ANTICIPATION
All good agent UIs show intent BEFORE execution. This is the "magic moment" where trust is built.

== Proposed Solution ==

### Core Concept: Intent Preview Layer

Build a thin UI layer (AnticipationUI) that sits between task parsing and action execution:

```
┌─────────────────────────────────────────────┐
│  INTENT DETECTION (what user wants)         │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│  TASK PARSING (what agent will do)           │
│  - Decompose into atomic steps              │
│  - Assess risk per step                     │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│  ★ ANTICIPATION PREVIEW ★                   │
│  - Show planned steps with descriptions     │
│  - Show reasoning per step                  │
│  - Show risk level per step                 │
│  - Show estimated impact                     │
│  - Wait for user confirmation               │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│  EXECUTION (act on approved steps)          │
└─────────────────────────────────────────────┘
```

### AnticipationUI Interface

```typescript
interface AnticipationUI {
  // Show user what agent plans to do
  preview(steps: IntentStep[]): Promise<Confirmation>;
  
  // Update progress as steps execute
  update(step: number, total: number, status: StepStatus): void;
  
  // Show final summary
  complete(result: ExecutionResult): void;
}

interface IntentStep {
  stepNumber: number;
  action: ActionContext;      // tool, target, details
  reasoning: string;           // why this action chosen
  risk: RiskAssessment;       // LOW/MEDIUM/HIGH
  alternative?: string;        // "or you could do X instead"
}

type Confirmation = "proceed" | "modify" | "cancel";
```

### UI States

1. **IDLE**: Agent ready, waiting for input
2. **PARSING**: "I'm thinking about how to do this..."
3. **ANTICIPATING**: "Here's what I plan to do:"
   - List of steps with risk badges
   - Reasoning for each step
   - Buttons: [Proceed All] [Modify Plan] [Cancel]
4. **EXECUTING**: "Step 2/4: Clicking [Submit]..."
   - Progress bar
   - Live feedback
5. **COMPLETE**: "Done! Here's what happened:"
   - Summary of changes
   - "Undo" option if applicable
6. **ERROR**: "Something went wrong:"
   - What failed
   - Options: [Retry] [Skip] [Cancel]

### Visual Format (Terminal/Discord Compatible)

```
🤔 Agent is thinking...
   └─ Parsing: "click delete, confirm"
   └─ Found 2 steps

📋 INTENT PREVIEW
┌──────────────────────────────────────────────────────┐
│ Step 1: Click [Delete Account] button               │
│   Reasoning: Found button at (450, 320), 94% match │
│   Risk: 🟡 MEDIUM (destructive action)              │
│                                                      │
│ Step 2: Press [Enter] to confirm                    │
│   Reasoning: Standard confirmation flow             │
│   Risk: 🟢 LOW                                       │
└──────────────────────────────────────────────────────┘

[✅ Proceed] [✏️ Modify] [❌ Cancel]
```

== Implementation Plan ==

### Phase 1: Core AnticipationUI (THIS ITERATION)
- Create `intent-detector.ts` - detects user intent from natural language
- Create `anticipation-ui.ts` - shows preview before execution
- Integrate into `computer_agent.ts` between _parseTask and _executeStep

### Phase 2: Discord Integration
- Show anticipation as Discord embeds
- Reaction-based confirmation (✅/❌/✏️)

### Phase 3: Visual Web UI (Future)
- Browser-based anticipation panel
- Real-time progress streaming

### File Structure
```
computer/
  ├── intent-detector.ts      # NEW: Parse intent → steps with reasoning
  ├── anticipation-ui.ts       # NEW: Preview UI layer
  ├── computer_agent.ts       # MODIFIED: Insert anticipation gate
  └── human_in_the_loop.ts    # EXISTING: Risk assessment
```

== Evaluation Criteria ==

### Must Pass
- [ ] Agent shows intent preview BEFORE executing any step
- [ ] User can approve/modify/cancel the plan
- [ ] Risk levels are visible per step
- [ ] Reasoning is shown for non-obvious actions

### Should Pass
- [ ] Confirmation works via keyboard (y/n) and Discord reactions
- [ ] Progress is visible during execution
- [ ] Errors are communicated clearly with recovery options

### Nice to Have
- [ ] "What if" exploration - show alternative plans
- [ ] Batch confirmation for trusted actions
- [ ] Learning from user corrections

== Integration Points ==

### With Human-in-the-Loop
AnticipationUI wraps around hitl.promptHuman() to show intent before the risk gate:
- HIGH risk → Always show anticipation + approval required
- MEDIUM risk → Show anticipation, approval optional
- LOW risk → Show anticipation, auto-approve

### With Screen Recognition
AnticipationUI can show the visual context:
- "I'm about to click the button at this location (screenshot)"
- Shows screenshot snippet with element highlighted

### With Agent Kernel
The anticipation layer becomes part of the standard agent loop:
- Observe → Parse Intent → Anticipate → (Human confirms) → Act → Verify → Loop

---

*Design by Agentic Kernel. Prototype implementation in progress.*