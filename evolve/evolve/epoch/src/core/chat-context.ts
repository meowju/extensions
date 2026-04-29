/**
 * chat-context.ts - Auto-Trigger Integration for Session Compaction
 * 
 * EPOCH 23: Bridge between callers (CLI/relay) and session-store.ts
 * 
 * Auto-trigger flow:
 * User message → appendWithAutoCompact() → appendToSession()
 *                                        → if needsCompaction() → compactSession()
 * 
 * Functions:
 * - appendWithAutoCompact(): Auto-compacts at COMPACT_THRESHOLD (20 messages)
 * - needsCompaction(): Check if session needs compaction
 * - triggerCompaction(): Manual trigger for /compact command
 * - getContext(): Get formatted LLM context
 */
import { 
  compactSession, 
  sessionNeedsCompaction, 
  COMPACT_THRESHOLD,
  appendToSession,
  loadSession,
  SessionMessage
} from './session-store';

/**
 * Options for chat context operations
 */
export interface ChatContextOptions {
  sessionId: string;
  maxTokens?: number;
  summarizeFn: (messages: SessionMessage[]) => Promise<string>;
}

/**
 * Result of appendWithAutoCompact
 */
export interface AppendResult {
  appended: boolean;
  compactionResult?: {
    messages: SessionMessage[];
    summary: string;
    originalCount: number;
    compactedCount: number;
  };
}

/**
 * Add a message to chat context and auto-compact if threshold reached.
 * 
 * @param sessionId - Session to append to
 * @param messages - Messages to add
 * @param options - Include summarizeFn for compaction
 * @returns Result indicating if appended and if compaction occurred
 */
export async function appendWithAutoCompact(
  sessionId: string,
  messages: SessionMessage[],
  options: ChatContextOptions
): Promise<AppendResult> {
  // First, append the messages to the session
  appendToSession(sessionId, messages);

  // Check if compaction is needed after appending
  if (sessionNeedsCompaction(sessionId)) {
    // Perform compaction and return result
    const result = await compactSession(sessionId, {
      maxTokens: options.maxTokens,
      summarizeFn: options.summarizeFn,
    });

    return {
      appended: true,
      compactionResult: result,
    };
  }

  return {
    appended: true,
  };
}

/**
 * Check if a session needs compaction.
 * Wrapper around sessionNeedsCompaction from session-store.ts.
 * 
 * @param sessionId - Session to check
 * @returns true if session has >= COMPACT_THRESHOLD messages
 */
export function needsCompaction(sessionId: string): boolean {
  return sessionNeedsCompaction(sessionId);
}

/**
 * Manually trigger compaction for a session.
 * Used for explicit /compact command.
 * 
 * @param sessionId - Session to compact
 * @param options - Include summarizeFn
 * @returns Compaction result (empty result for empty/non-existent sessions)
 */
export async function triggerCompaction(
  sessionId: string,
  options: ChatContextOptions
): Promise<{
  messages: SessionMessage[];
  summary: string;
  originalCount: number;
  compactedCount: number;
}> {
  // Load session - if doesn't exist or empty, return empty result
  const messages = loadSession(sessionId);
  
  if (messages.length === 0) {
    return {
      messages: [],
      summary: "",
      originalCount: 0,
      compactedCount: 0,
    };
  }
  
  // If only 1-2 messages, nothing to compact
  if (messages.length <= 2) {
    return {
      messages,
      summary: "",
      originalCount: messages.length,
      compactedCount: messages.length,
    };
  }
  
  return compactSession(sessionId, {
    maxTokens: options.maxTokens,
    summarizeFn: options.summarizeFn,
  });
}

/**
 * Get formatted context for LLM consumption.
 * Returns recent messages with summary marker if compacted.
 *
 * @param sessionId - Session to get context for
 * @param maxRecent - Maximum recent messages to return (default: all)
 * @returns ContextResult object with hasSummary, messages, and formattedContent
 */
export function getContext(sessionId: string, maxRecent?: number): { hasSummary: boolean; messages: SessionMessage[]; formattedContent: string } {
  const messages = loadSession(sessionId);

  // Empty session
  if (messages.length === 0) {
    return { hasSummary: false, messages: [], formattedContent: "" };
  }

  // Check if session has summary marker (compacted)
  // Look for either exact marker or partial match (marker with additional details)
  const hasSummary = messages.some(
    (m) => m.role === "system" && (m.content.includes("[Previous conversation summarized]") || m.content.includes("Previous conversation summarized"))
  );

  // Filter messages for context
  let contextMessages = messages;

  // If maxRecent specified, take only the last N messages
  if (maxRecent !== undefined && maxRecent > 0) {
    // But always include summary marker if present
    if (hasSummary) {
      const summaryMessages = messages.filter(
        (m) => m.role === "system" && m.content.includes("[Previous conversation summarized]")
      );
      const recentMessages = messages.slice(-maxRecent);
      contextMessages = [...summaryMessages, ...recentMessages];
    } else {
      contextMessages = messages.slice(-maxRecent);
    }
  } else if (hasSummary) {
    // Add summary marker header for compacted sessions
    // Get non-summary messages to include in context
    const nonSummaryMessages = messages.filter(
      (m) => !(m.role === "system" && m.content.includes("[Previous conversation summarized"))
    );
    contextMessages = nonSummaryMessages;
  }

  // Format as context string
  return { hasSummary, messages: contextMessages, formattedContent: formatContext(contextMessages) };
}

/**
 * Format messages into a context string for LLM
 * Ensures [Previous conversation summarized] marker is included for compacted sessions
 */
function formatContext(messages: SessionMessage[]): string {
  if (messages.length === 0) return "";

  const lines: string[] = [];
  let summaryHeaderAdded = false;

  for (const msg of messages) {
    if (msg.role === "system") {
      // Check for summary marker in content
      const hasSummaryMarker = msg.content.includes("[Previous conversation summarized]");
      
      if (hasSummaryMarker && !summaryHeaderAdded) {
        // Add the summary header marker at the top
        lines.push("[Previous conversation summarized]");
        summaryHeaderAdded = true;
      }
      // Include the full system message
      lines.push(`[System]\n${msg.content}`);
    } else {
      lines.push(`[${msg.role}]\n${msg.content}`);
    }
    lines.push(""); // Add blank line between messages
  }

  return lines.join("\n").trim();
}

/**
 * chatContext object - exports all functions for easy import
 */
export const chatContext = {
  appendWithAutoCompact,
  needsCompaction,
  triggerCompaction,
  getContext,
};