=== Research: Iteration 4 Summary - Deep Dive on Known Issues ===

Date: 2026-04-24

== Bug Investigation: Diff/Code Block Flash and Freeze ==

**Finding: This is NOT a Meow-specific bug, it's a broader agentic pattern problem.**

Cursor documented fixing this exact issue in their changelog:
- "Large edits stream more smoothly after cutting dropped frames by ~87%"
- "Fixed bug where agent conversations with diffs/code blocks would flash and freeze"
- "Hitting enter for follow-up in long chat 'used to hang for over a second and now feels instant'"

**Root Cause Analysis:**
The issue occurs because:
1. Streaming output with code blocks/diffs contains special characters (backticks, newlines, indentation)
2. Raw terminal writes don't account for ANSI cursor positioning
3. Large diffs cause buffer overflow in terminal rendering
4. The model sends incremental output that overlaps with cursor position

**Meow's Current State:**
Meow's streaming.ts has a `TokenBuffer` class that flushes every 20 chars or 50ms. However, the CLI doesn't use this for the main `runLeanAgent` - only `runAgentStream` uses it. The main relay flow uses non-streaming `runLeanAgent`.

**Fix Needed:**
1. Apply buffering to ALL streaming output, not just `/stream` mode
2. Handle code block boundaries specially (flush before/after code fences)
3. Implement Cursor's "avoid expensive updates unless truly needed" pattern

== What Meow Should Steal ==

1. **Lazy Update Pattern** (Cursor): "The Agents Window now avoids expensive updates and fetches unless they're truly needed." - Don't re-render on every token.

2. **Code Block Aware Buffering** - Flush buffer at code fence boundaries, not arbitrary char counts.

3. **Frame Drop Detection** - Monitor rendering performance and adjust buffer size dynamically.

4. **Tab Resolution Within Agent Context** (Cursor): "File tab names are now resolved within the current agent's visible tabs instead of trying to be globally unique" - Apply this to conversation tabs/scopes.

== What Meow Should Avoid ==

1. **Per-Token Terminal Writes** - Every stdout.write() triggers terminal re-render. Batch writes.

2. **Global State for Local Context** - Tab/diff state shouldn't need global uniqueness.

== Next Steps ==

Priority fixes for Meow:
1. Apply TokenBuffer to main relay flow (not just /stream mode)
2. Add code block boundary detection to flush at fence boundaries
3. Add performance monitoring for streaming
4. Implement Cursor's "lazy updates" for heavy operations

== Iteration 3 Failure Analysis ==

From dogfood results (2026-04-24T172340Z.json):
- 3 tests failed out of 408 total (99.3% pass rate)
- 72 tests skipped (MCP/integration tests)

**Failed Test 1: GAP-UI-003 (False Positive)**
- Issue: Test expects 'progress' keyword to NOT exist, but it appears in 'LIMIT REACHED' message
- Fix: Update test to use more specific pattern matching

**Failed Test 2: Grep Tool**
- Issue: grep tool returns empty content when ripgrep not available
- Root cause: Silent fallback chain (ripgrep → grep → empty) doesn't surface the error
- Fix: Make fallback explicit with warning message

**Failed Test 3: Abort Mid-Execution**
- Issue: OpenAI SDK throws 'Request was aborted' instead of graceful return
- Fix: Catch specific abort error in streaming loop

**Overall Assessment:**
The codebase is mature (99%+ pass rate). The failures are edge cases in error handling, not core functionality. The main gaps are:
- P0 Critical: 6 gaps identified
- P1 High: 20 gaps identified
- P2 Medium: 16 gaps identified
- P3 Future: 7 gaps identified

**Maturity Score: 4/10** - Still early stage, significant work needed on UI/UX, error handling, and autonomous operation patterns.

== Cross-Cutting Insights ==

From Cursor + Claude Code research, common patterns for agentic tools:

**What ALL top tools do:**
1. Lazy updates - don't re-render unless necessary
2. Learned user preferences - track approvals to reduce friction
3. Graceful degradation - partial results > crash
4. Session persistence - resume work across invocations
5. Clear permission model - dangerous vs safe, explicit escalation

**What NO tool does well (opportunity):**
1. Multi-agent coordination UI
2. Human-in-the-loop at appropriate granularity
3. Memory that feels natural, not forced
4. Error recovery that's a learning opportunity

== Sources ==
- https://cursor.com/changelog (Apr 15, 2026; Apr 14, 2026)
- Claude Code CLI source analysis
- Iteration 3 dogfood results: /app/agent-harness/dogfood/results/2026-04-24T172340Z.json
