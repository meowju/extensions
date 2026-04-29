# Design Proposal: Session Compaction UI
**Capability:** Session Compaction via LLM Summarization  
**Epoch:** Epoch 11 (Validated)  
**Date:** 2026-04-24  
**Author:** Agentic Kernel Design Team

---

## Executive Summary

Session Compaction has been validated by Epoch 11 tests. This proposal designs human-agent interfaces for the three core features: **summary detection**, **selective history trimming**, and **token budget management controls**.

---

## 1. Summary Detection Interface

### 1.1 Compaction Status Indicator

**Location:** Agent status bar / conversation header  
**Trigger:** When `needsCompaction()` returns true or during active compaction

```
┌─────────────────────────────────────────────────────────┐
│ 🗜️ [Compacting conversation...] Summary #3 of 7 active  │
│    • 40 messages → 3 key points                         │
│    • Topics: Docker, API design, testing               │
│    • [Show details] [Cancel]                            │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Post-Compaction Summary Card

**Location:** Appears as system message after compaction completes

```
┌─────────────────────────────────────────────────────────┐
│ 💾 CONVERSATION COMPACTED                               │
│                                                         │
│ 📋 Summary saved:                                      │
│    "Discussed: Docker deployment, API structure.        │
│     Meow helped with: Debugging the container           │
│     networking issue. (18 messages)"                    │
│                                                         │
│ 🔑 Key facts extracted:                                 │
│    • User is building a Discord bot in TypeScript       │
│    • Working on Docker container configuration          │
│                                                         │
│ [View full summary] [Review history] [Adjust settings]  │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Memory Health Dashboard Widget

**Location:** Sidebar / dashboard panel  
**Purpose:** Shows compaction status across all threads

```
┌─────────────────────────────────────────────────────────┐
│ 🧠 MEMORY STATUS                                        │
├─────────────────────────────────────────────────────────┤
│ Thread: general-chat                                    │
│ ┌─────────────────────────────────────────────────┐    │
│ │ ████████████████░░░░░░░░░░ 62% (31/50 msgs)    │    │
│ └─────────────────────────────────────────────────┘    │
│ Messages: 31 | Compressed: 2 | Budget: 2,400 tokens    │
│                                                         │
│ [View thread] [Compact now] [Settings]                 │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Selective History Trimming Interface

### 2.1 Thread Memory Editor

**Location:** Thread settings panel (accessible via `/memory` command)

```
┌─────────────────────────────────────────────────────────┐
│ 📝 THREAD MEMORY EDITOR                    [× Close]   │
├─────────────────────────────────────────────────────────┤
│ Thread: project-discussion  |  3 active summaries        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ SUMMARY #1 (oldest) ─────────────────────────────┐  │
│ │ "Discussed: project architecture, database         │  │
│ │  schema design. Outcome: Decided to use SQLite      │  │
│ │  for MVP. (22 messages)"                            │  │
│ │                                                     │  │
│ │ Topics: [architecture] [database] [sqlite]         │  │
│ │                                                     │  │
│ │ [🔍 Expand] [✏️ Edit] [🗑️ Delete] [📌 Pin]        │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ ┌─ SUMMARY #2 ──────────────────────────────────────┐  │
│ │ "Discussed: API endpoints, authentication.         │  │
│ │  Meow helped with: Reviewing JWT implementation.    │  │
│ │  (15 messages)"                                     │  │
│ │                                                     │  │
│ │ Topics: [api] [authentication] [jwt]                │  │
│ │                                                     │  │
│ │ [🔍 Expand] [✏️ Edit] [🗑️ Delete] [📌 Pin]        │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ ┌─ RECENT (working memory) ──────────────────────────┐  │
│ │ You: I fixed the JWT issue! 🎉                     │  │
│ │ Meow: Great! Can you share the updated code?       │  │
│ │ You: Sure, let me push it to GitHub                │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ [+ Add manual summary] [Compact all] [Export history]   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Selective Preservation Controls

**Location:** Inline with message actions (hover menu)

```
┌─────────────────────────────────────────────────────────┐
│ When hovering over a message or summary:                │
│                                                         │
│ ┌─ Message: "I'm building a Discord bot in TypeScript" ┐ │
│ │ [📌 Pin] [🔒 Lock] [🏷️ Tag: important] [🗑️ Exclude]  │ │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ Actions:                                               │
│ • Pin: Keep in working memory permanently              │
│ • Lock: Never include in compaction (e.g., credentials) │
│ • Tag: Custom labels for selective compaction           │
│ • Exclude: Remove from future summaries                  │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Bulk Selection Mode

**Location:** Thread memory editor (checkbox selection)

```
┌─────────────────────────────────────────────────────────┐
│ SELECT MODE: 3 items selected          [Cancel] [Done]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ☐ SUMMARY #1: "Project architecture discussion..."     │
│ ☑ SUMMARY #2: "API design session..."                  │
│ ☐ SUMMARY #3: "Database migration talk..."             │
│ ☑ RECENT: "I fixed the JWT issue!"                     │
│ ☐ RECENT: "Sure, let me push it..."                    │
│                                                         │
│ ─────────────────────────────────────────────────────  │
│ BULK ACTIONS:                                          │
│ [Merge selected into one summary]                       │
│ [Delete selected messages]                              │
│ [Regenerate summary for selection]                      │
│ [Export selection as transcript]                       │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Token Budget Management Controls

### 3.1 Global Memory Budget Settings

**Location:** Agent settings → Memory → Token Budget

```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ TOKEN BUDGET SETTINGS                    [× Close]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ MEMORY LIMITS ───────────────────────────────────┐  │
│ │                                                         │
│ │ Working Memory Size              [10] messages      │  │
│ │     └─ Kept uncompressed for quick access           │  │
│ │                                                         │  │
│ │ Compaction Threshold             [20] messages       │  │
│ │     └─ When to trigger auto-compaction              │  │
│ │                                                         │  │
│ │ Max Compressed Summaries         [20] summaries       │  │
│ │     └─ Older summaries auto-deleted beyond this     │  │
│ │                                                         │  │
│ │ Max Context Characters            [4000] chars        │  │
│ │     └─ Context sent to LLM per request              │  │
│ │                                                         │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ ┌─ TOKEN ESTIMATES ─────────────────────────────────┐  │
│ │                                                         │
│ │ Current thread: ~2,340 tokens                        │  │
│ │ After compaction: ~1,200 tokens                      │  │
│ │ Savings: ~49% reduction                             │  │
│ │                                                         │  │
│ │ ┌─────────────────────────────────────────────┐    │  │
│ │ │ Budget: [████████░░░░░░░░░] 58% used        │    │  │
│ │ └─────────────────────────────────────────────┘    │  │
│ │                                                         │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ ┌─ PRESETS ─────────────────────────────────────────┐  │
│ │                                                         │  │
│ │ [🔥 Aggressive] [⚖️ Balanced] [💾 Conservative]      │  │
│ │   10 msgs / 15 thr    20 msgs / 40 thr    30 msgs / 60 thr │
│ │   Compact @ 15        Compact @ 40          Compact @ 60   │
│ │                                                         │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ [Reset to defaults] [Save settings]                     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Per-Thread Budget Overrides

**Location:** Thread settings (right-click thread → Settings)

```
┌─────────────────────────────────────────────────────────┐
│ 🧵 THREAD-SPECIFIC SETTINGS                           │
├─────────────────────────────────────────────────────────┤
│ Thread: project-discussion                             │
│                                                         │
│ Override global settings: [○ Off ● On]                 │
│                                                         │
│ ┌─ If enabled, shows individual controls: ───────────┐  │
│ │                                                         │
│ │ This thread's budget: [3000] chars (max: 4000)     │  │
│ │ Custom threshold: [15] messages                      │  │
│ │ Priority: [Normal ▼ High | Critical]                 │  │
│ │                                                         │  │
│ │ "High priority threads keep more context"            │  │
│ │                                                         │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ [Apply to this thread only] [Apply to all threads]      │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Real-Time Budget Monitor

**Location:** Floating indicator / status bar

```
┌─────────────────────────────────────────────────────────┐
│ 💰 BUDGET: 2,340 / 4,000 tokens    [▓▓▓▓▓▓▓░░░] 58%    │
│ ⏱️ Latency impact: +120ms (compaction overhead)        │
│ 📊 Compression ratio: 2.1x (excellent)                │
│                                                         │
│ [Expand details] [View history] [Adjust budget]         │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Error States & Edge Cases

### 4.1 Compaction Failure Alert

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ COMPACTION FAILED                                   │
│                                                         │
│ Could not compact thread: project-discussion           │
│ Reason: LLM unavailable or timeout                     │
│                                                         │
│ Last successful compaction: 2 hours ago                │
│ Thread now at: 47 messages (over threshold)            │
│                                                         │
│ [Retry compaction] [Compact manually] [Dismiss]        │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Low Budget Warning

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ BUDGET LOW                                          │
│                                                         │
│ Context usage: 3,890 / 4,000 tokens (97%)              │
│                                                         │
│ Suggestions:                                           │
│ • Trigger compaction to free ~1,600 tokens             │
│ • Reduce working memory size from 10 to 5 messages     │
│ • Archive or pin less important threads                │
│                                                         │
│ [Compact now] [Adjust settings] [Remind me later]      │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/memory` | Open memory editor |
| `/compact` | Trigger manual compaction |
| `/budget` | Open budget settings |
| `Ctrl+P` | Pin current message |
| `Ctrl+K` | Lock from compaction |
| `Ctrl+Shift+M` | Toggle memory widget |

---

## 6. Implementation Checklist

- [ ] `CompactionStatusIndicator` component
- [ ] `SummaryCard` component (post-compaction)
- [ ] `MemoryHealthDashboard` widget
- [ ] `ThreadMemoryEditor` panel
- [ ] `SelectivePreservationControls` (pin/lock/tag/exclude)
- [ ] `BulkSelectionMode` in editor
- [ ] `BudgetSettingsPanel` with presets
- [ ] `PerThreadBudgetOverrides` panel
- [ ] `RealTimeBudgetMonitor` floating indicator
- [ ] `CompactionFailureAlert` component
- [ ] `LowBudgetWarning` component
- [ ] Keyboard shortcut bindings

---

## 7. API Extensions for UI

```typescript
// New methods for UI integration
interface MemoryStore {
  // Current state for UI
  getCompactionStatus(channelId: string): CompactionStatus;
  getBudgetUsage(channelId: string): BudgetMetrics;
  getThreadMemorySummary(channelId: string): ThreadMemorySummary;
  
  // User actions
  pinMessage(channelId: string, messageIndex: number): void;
  lockMessage(channelId: string, messageIndex: number): void;
  regenerateSummary(channelId: string, summaryId: string): void;
  deleteSummary(channelId: string, summaryId: string): void;
  
  // Budget controls
  setBudgetPreset(channelId: string, preset: BudgetPreset): void;
  overrideThreadBudget(channelId: string, settings: Partial<BudgetSettings>): void;
}

interface CompactionStatus {
  needsCompaction: boolean;
  messageCount: number;
  summaryCount: number;
  estimatedTokens: number;
  lastCompaction: number | null;
}

interface BudgetMetrics {
  currentTokens: number;
  maxTokens: number;
  compressionRatio: number;
  latencyImpact: number;
}

interface ThreadMemorySummary {
  threadId: string;
  workingMemorySize: number;
  compactThreshold: number;
  summaries: CompressedSummary[];
  recentMessages: ThreadMessage[];
}
```

---

## 8. Wireframe Sketches

### Wireframe A: Memory Widget in Sidebar
```
┌──────────────────┐
│ 🧠 Memory        │
├──────────────────┤
│ general-chat     │
│ ████████░░ 68%   │
│                  │
│ #coding          │
│ ██████████ 100%   │
│ ⚠️ Over budget   │
│                  │
│ #random          │
│ ████░░░░░ 40%    │
└──────────────────┘
```

### Wireframe B: Mobile Compact View
```
┌─────────────────┐
│ 🧠 Mem 2.3k/4k  │
│ ▓▓▓▓▓░░░ 58%    │
│ [Compacting...] │
└─────────────────┘
         │
         ▼ (tap)
┌─────────────────┐
│ 💾 COMPACTED    │
│ Saved 1.1k tok  │
│ 3 facts found   │
│ [Show summary]  │
└─────────────────┘
```

---

## 9. Accessibility Considerations

- All compaction actions announced via screen reader
- Color-blind safe budget indicators (patterns + colors)
- Keyboard-navigable memory editor
- High contrast mode support
- Reduced motion option (no animation during compaction)

---

## 10. Validation Criteria

- [ ] User can view compaction status without scrolling
- [ ] User can adjust budget settings in < 3 clicks
- [ ] Selective pinning works on mobile
- [ ] Compaction alerts are non-blocking but noticeable
- [ ] All actions undoable within session
- [ ] Memory widget loads in < 200ms