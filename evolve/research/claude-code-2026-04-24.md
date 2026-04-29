=== Research: Claude Code ===

Date: 2026-04-24

== What It Does ==

Claude Code (claude.ai/code) is Anthropic's CLI tool for autonomous coding. It provides a full agentic development environment with streaming output, tool execution, and permission management. Key features include:

- Streaming token-by-token output to terminal
- Built-in permissions system with auto-approve patterns
- MCP (Model Context Protocol) server support
- Session persistence across CLI invocations
- Slash commands for common operations
- Auto-mode for continuous autonomous operation

== How It Works ==

**Streaming Architecture**
- Uses server-sent events (SSE) for real-time token streaming
- Tokens arrive in small chunks from the API
- Terminal output is written directly via stdout
- No buffering layer - raw streaming to terminal

**Permission System**
- Interactive permission prompts for destructive/risky operations
- `--dangerously-skip-permissions` flag for autonomous operation
- Patterns learned: if user approves same operation 3+ times, auto-approve
- Clear separation: "This will delete X files. Proceed? [y/N]"

**Tool Execution**
- Tools called in sequence, output returned to model between calls
- Shell commands run with configurable timeout
- Git operations handled natively
- MCP tools registered dynamically from config

**Session Management**
- Sessions stored in `~/.claude/sessions/`
- Each session maintains conversation history
- `--resume` flag to continue previous session
- Session compaction when context exceeds limit

**Streaming & Rendering** (from changelog patterns)
- Long conversations with code blocks: "Hitting enter for follow-up used to hang for over a second"
- Large edits stream more smoothly: "cut dropped frames by ~87%"
- Agent conversations with diffs/code blocks flash and freeze: "Fixed bug"

**Key Technical Patterns**
- Non-blocking I/O for tool execution
- AbortController for graceful interruption
- Token budget tracking with graceful stop
- Grace iteration: final turn to summarize when limits reached

== What Meow Should Steal ==

1. **Grace Iteration on Limit** - When max iterations/budget reached, give agent one final turn to summarize progress and finalize state. Prevents incomplete responses.

2. **Learned Auto-Approve** - Track user's approval patterns. After 3+ approvals of same operation type, auto-approve. Reduces friction for trusted patterns.

3. **Permission Escalation** - Clear separation between dangerous and safe. Dangerous operations always prompt unless in `--dangerous` mode.

4. **Graceful Abort** - Use AbortController throughout. On abort, finish current operation cleanly, return partial results, don't crash mid-stream.

5. **Session Compaction** - When context exceeds limit, use LLM to summarize conversation, preserving key facts/decisions. Keep compressed version.

6. **Token Budget with Early Warning** - Track costs in real-time. When approaching budget, warn user and/or stop gracefully at natural boundary.

7. **Diff-to-File Navigation** - From diff summary, allow jump to exact file location. Don't make user search manually.

== What Meow Should Avoid ==

1. **Raw Streaming to Terminal** - Direct stdout writes cause flicker with complex output. Use buffering for smooth rendering.

2. **Blocking Tool Execution** - Don't block the streaming loop waiting for tool result. Process async and yield back to stream.

3. **Global Session State** - Session state scoped to CLI invocation. Don't leak state between runs unless explicitly resumed.

4. **Silent Permission Denials** - If tool blocked, explain WHY clearly. "Permission denied" is unhelpful; "This would delete 3 files. Use --dangerous to proceed." is helpful.

5. **Mid-Stream Crashes** - Don't let errors kill the stream. Catch, log, and continue with partial results.

== Next Steps ==

1. Add grace iteration to lean-agent.ts when max iterations reached
2. Implement learned auto-approve for permission patterns  
3. Add session compaction using LLM summarization
4. Fix streaming to use buffering layer (not raw stdout)
5. Add token budget tracking with warnings

Sources:
- https://docs.anthropic.com/en/docs/claude-code
- Anthropic Claude Code CLI source analysis
- Iteration 3 learnings (gap: UI/TUI issues, permission bloat)
