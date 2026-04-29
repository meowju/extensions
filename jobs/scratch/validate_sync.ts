#!/usr/bin/env bun
/**
 * Validation Test: JOB.md ↔ CLAUDE.md Sync Checker
 * Verifies completed missions are marked in both files.
 */

const JOB_PATH = "../../JOB.md";
const CLAUDE_PATH = "../../CLAUDE.md";

interface CompletedMission {
  id: string;
  title: string;
  inJOB: boolean;
  inCLAUDE: boolean;
}

// Extract completed mission IDs from a file
function extractCompletedMissions(content: string): string[] {
  const matches = content.matchAll(/\[x\]\s*\*\*\[(XL-\d+|Epoch-\d+)\]/g);
  return [...matches].map(m => m[1]);
}

async function main() {
  console.log("🔍 Validating JOB.md ↔ CLAUDE.md sync...\n");
  
  const [jobContent, claudeContent] = await Promise.all([
    Bun.file(JOB_PATH).text(),
    Bun.file(CLAUDE_PATH).text()
  ]);
  
  const jobMissions = extractCompletedMissions(jobContent);
  const claudeMissions = extractCompletedMissions(claudeContent);
  
  const allMissions = [...new Set([...jobMissions, ...claudeMissions])].sort();
  
  const results: CompletedMission[] = allMissions.map(id => ({
    id,
    title: extractTitle(id, jobContent) || extractTitle(id, claudeContent) || "Unknown",
    inJOB: jobMissions.includes(id),
    inCLAUDE: claudeMissions.includes(id)
  }));
  
  // Check for mismatches
  const mismatches = results.filter(m => m.inJOB !== m.inCLAUDE);
  
  console.log("📊 Mission Status:\n");
  results.forEach(m => {
    const status = m.inJOB && m.inCLAUDE 
      ? "✅ SYNCED" 
      : m.inJOB ? "⚠️  JOB only" 
      : "⚠️  CLAUDE only";
    console.log(`  ${status} ${m.id}: ${m.title}`);
  });
  
  console.log(`\n📈 Summary: ${results.length} total missions`);
  console.log(`  ✅ Synced: ${results.length - mismatches.length}`);
  console.log(`  ⚠️  Mismatched: ${mismatches.length}`);
  
  if (mismatches.length > 0) {
    console.log("\n❌ SYNC ERROR: Mismatched completion status!");
    process.exit(1);
  }
  
  console.log("\n✅ All completed missions are in sync!");
}

function extractTitle(id: string, content: string): string | null {
  const regex = new RegExp(`\\[x\\]\\s+\\*\\*\\[${id}\\].*?:\\s*(.+?)(?:\\n|\\*)`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

main().catch(console.error);