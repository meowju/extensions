import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Deterministic paths that prefer the current working directory for generic agent use
const getAgentDir = (sub: string) => {
  const cwdDir = join(process.cwd(), ".agents", sub);
  const fallbackDir = join(__dirname, "../../.agents", sub);
  // We prefer CWD if it has the directory or if we are in a generic run
  return cwdDir;
};

const MEMORY_DIR = getAgentDir("memory");
const MAIN_MEMORY_FILE = join(MEMORY_DIR, "memory.md");
const SOUL_DIR = getAgentDir("soul");
const MAIN_SOUL_FILE = join(SOUL_DIR, "soul.md");

// In-memory user profiles for bond system
interface UserProfile {
  lastSeen: number;
  username: string;
  bondStrength: number;
  bondTone: string;
  bondGreeting?: string;
}

const userProfiles = new Map<string, UserProfile>();

// MemoryStore class for relay.ts compatibility
export class MemoryStore {
  constructor(private dataDir: string) {}

  async loadMemory(): Promise<string> {
    return loadLongTermMemory();
  }

  async loadSoul(): Promise<string> {
    return loadSoul();
  }

  async updateMemory(newInfo: string): Promise<string> {
    return updateMemory(newInfo);
  }

  // Save method (no-op for compatibility - data is written directly)
  save(): void {
    // Memory is written directly on update, no periodic save needed
  }

  // Bond system methods
  updateLastSeen(userId: string, username: string): void {
    const existing = userProfiles.get(userId);
    if (existing) {
      existing.lastSeen = Date.now();
      existing.username = username;
    } else {
      userProfiles.set(userId, {
        lastSeen: Date.now(),
        username,
        bondStrength: 0.5,
        bondTone: "friendly",
      });
    }
  }

  getBondTone(userId: string): string {
    const profile = userProfiles.get(userId);
    return profile?.bondTone || "friendly";
  }

  getBondStrength(userId: string): number {
    const profile = userProfiles.get(userId);
    return profile?.bondStrength || 0.5;
  }

  getBondGreeting(userId: string, username: string): string | undefined {
    const profile = userProfiles.get(userId);
    return profile?.bondGreeting;
  }

  buildUserContext(userId: string, username: string): string | undefined {
    const profile = userProfiles.get(userId);
    if (!profile) return undefined;
    return `Known user: ${username} (last seen: ${new Date(profile.lastSeen).toLocaleString()})`;
  }

  getThreadContext(channelId: string, username: string): string | undefined {
    // Thread context - could be expanded to track conversation threads
    return undefined;
  }

  incrementInteractions(userId: string): void {
    const existing = userProfiles.get(userId);
    if (existing) {
      existing.bondStrength = Math.min(1.0, (existing.bondStrength || 0.5) + 0.05);
    } else {
      userProfiles.set(userId, {
        lastSeen: Date.now(),
        username: userId,
        bondStrength: 0.5,
        bondTone: "friendly",
      });
    }
  }

  updateSoulRelationship(userId: string, username: string, relationship: string): void {
    const existing = userProfiles.get(userId);
    if (existing) {
      existing.bondTone = relationship || existing.bondTone;
    } else {
      userProfiles.set(userId, {
        lastSeen: Date.now(),
        username,
        bondStrength: 0.5,
        bondTone: relationship || "friendly",
      });
    }
  }

  addMessageToThread(channelId: string, userId: string, role: string, content: string): void {
    // Stub: track conversation messages per channel/user thread
  }

  processConversationForFacts(userId: string, username: string, userMsg: string, agentMsg: string): void {
    // Stub: extract and store factual information from conversations
  }

  consumeEvents(sinceTimestamp: number): any[] {
    // Stub: return pending events since timestamp
    return [];
  }

  broadcastEvent(eventType: string, payload: any): void {
    // Stub: broadcast event to bus
    console.log(`[Bus] Event: ${eventType}`, payload);
  }

  heartbeat(id: string, name: string, role: string): void {
    // Stub: register heartbeat
  }
}

export async function loadLongTermMemory(): Promise<string> {
  try {
    let memoryContent = "";
    
    // Read the main memory file
    try {
      const mainContent = await readFile(MAIN_MEMORY_FILE, "utf-8");
      memoryContent += `\n### LONG-TERM MEMORY (memory.md)\n${mainContent}\n`;
    } catch {
      // Ignore if memory.md is missing
    }
    
    // Read other logs/files in memory dir
    try {
      const files = await readdir(MEMORY_DIR);
      for (const file of files) {
        if (file.endsWith(".md") && file !== "memory.md") {
          const content = await readFile(join(MEMORY_DIR, file), "utf-8");
          memoryContent += `\n--- LOG: ${file} ---\n${content}\n`;
        }
      }
    } catch {
      // Ignore if dir is missing
    }
    
    return memoryContent || "(Memory is currently empty)";
  } catch (error) {
    console.warn("Error reading memory.");
    return "(Memory is currently empty)";
  }
}

export async function loadSoul(): Promise<string> {
  try {
    const soulContent = await readFile(MAIN_SOUL_FILE, "utf-8");
    return `\n### AGENT SOUL (soul.md)\n${soulContent}\n`;
  } catch {
    return ""; // Soul is optional
  }
}

export async function updateMemory(newInfo: string): Promise<string> {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const entry = `\n- [${timestamp}] ${newInfo}`;
    
    // Append to Knowledge Entries section in memory.md
    const currentMemory = await readFile(MAIN_MEMORY_FILE, "utf-8");
    
    let updatedMemory = currentMemory;
    if (currentMemory.includes("## Knowledge Entries")) {
      updatedMemory = currentMemory.replace("## Knowledge Entries", `## Knowledge Entries${entry}`);
    } else {
      updatedMemory += `\n\n## Knowledge Entries${entry}`;
    }
    
    await writeFile(MAIN_MEMORY_FILE, updatedMemory);
    return `Memory updated successfully with: "${newInfo}"`;
  } catch (error: any) {
    return `Error updating memory: ${error.message}`;
  }
}
