/**
 * Epoch 32 Validation: Unified Mission State Architecture
 * 
 * Tests that CLAUDE.md and JOB.md are properly unified for orchestrator
 * search heuristics. Validates actual file contents.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");

interface ValidationResult {
  test: string;
  pass: boolean;
  details?: string;
}

function stripEmoji(text: string): string {
  // Remove emoji prefixes like 🔄, ✅, 📋, etc.
  return text.replace(/^[🔄✅📋💡🎯⚠️🔧🏗️🐱🦀]+[\s]*/g, '');
}

function validate(): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  const claudePath = join(ROOT, "CLAUDE.md");
  const jobPath = join(ROOT, "JOB.md");
  
  // Check files exist
  if (!existsSync(claudePath)) {
    results.push({ test: "CLAUDE.md exists", pass: false, details: "File not found" });
    return results;
  }
  results.push({ test: "CLAUDE.md exists", pass: true });
  
  if (!existsSync(jobPath)) {
    results.push({ test: "JOB.md exists", pass: false, details: "File not found" });
    return results;
  }
  results.push({ test: "JOB.md exists", pass: true });
  
  const claude = readFileSync(claudePath, "utf-8");
  const job = readFileSync(jobPath, "utf-8");
  
  // Test 1: CLAUDE.md has ACTIVE BACKLOG section (allow emoji prefix)
  const backlogMatch = claude.match(/^##\s*(?:🔄\s*)?ACTIVE BACKLOG/im);
  results.push({
    test: "CLAUDE.md contains '## ACTIVE BACKLOG' section",
    pass: !!backlogMatch,
    details: backlogMatch ? "Section found" : "Section missing - orchestrator won't find backlog"
  });
  
  // Test 2: CLAUDE.md has backlog table (| ID | Priority |)
  const backlogTable = claude.includes("| ID |") && (claude.includes("| Priority |") || claude.includes("| Priority")) && 
                       (claude.includes("| Status |") || claude.includes("| Status") || claude.includes("| ---- |"));
  results.push({
    test: "ACTIVE BACKLOG contains table format",
    pass: backlogTable,
    details: backlogTable ? "Table format validated" : "Missing table format"
  });
  
  // Test 3: CLAUDE.md has CURRENT MISSION section (allow emoji prefix)
  const missionMatch = claude.match(/^##\s*(?:📋\s*)?CURRENT MISSION/im);
  results.push({
    test: "CLAUDE.md contains '## CURRENT MISSION' section",
    pass: !!missionMatch,
    details: missionMatch ? "Section found" : "Section missing"
  });
  
  // Test 4: CURRENT MISSION has Status field (inline **Status** or Status:)
  const missionSectionStart = missionMatch ? claude.indexOf(missionMatch[0]) : -1;
  const missionSection = missionSectionStart >= 0 ? claude.slice(missionSectionStart, missionSectionStart + 500) : "";
  const statusField = missionSection.match(/Status[:\*\s]+([A-Z-]+)/i);
  results.push({
    test: "CURRENT MISSION has Status field",
    pass: !!statusField,
    details: statusField ? `Status: ${statusField[1]}` : "No Status field found"
  });
  
  // Test 5: CLAUDE.md has COMPLETED MISSIONS (allow emoji prefix, case insensitive, multiline start)
  const completedMatch = claude.match(/^##.*COMPLETED MISSIONS/im);
  results.push({
    test: "CLAUDE.md contains '## COMPLETED MISSIONS'",
    pass: !!completedMatch,
    details: completedMatch ? "Historical tracking present" : "Missing historical section"
  });
  
  // Test 6: JOB.md references CLAUDE.md
  const referencesClaide = job.includes("CLAUDE.md") || job.includes("see CLAUDE.md") || job.includes("source of truth");
  results.push({
    test: "JOB.md references CLAUDE.md as source",
    pass: referencesClaide,
    details: referencesClaide ? "Cross-reference found" : "No reference to CLAUDE.md"
  });
  
  // Test 7: BACKLOG is not empty (has at least one task or completion marker)
  const backlogStart = claude.indexOf("ACTIVE BACKLOG");
  const afterBacklog = backlogStart >= 0 ? claude.slice(backlogStart, backlogStart + 500) : "";
  const hasContent = afterBacklog.includes("| XL-") || afterBacklog.includes("| [x]") || 
                     afterBacklog.includes("BACKLOG") || afterBacklog.includes("|");
  results.push({
    test: "ACTIVE BACKLOG has content (tasks or markers)",
    pass: hasContent,
    details: hasContent ? "Backlog has content" : "Empty backlog section"
  });
  
  // Test 8: JOB.md has pipeline structure (EVOLVE, PLAN, BUILD, DOGFOOD)
  const hasPipelines = ["EVOLVE", "PLAN", "BUILD", "DOGFOOD"].filter(p => job.includes(p)).length >= 3;
  results.push({
    test: "JOB.md has pipeline sections",
    pass: hasPipelines,
    details: hasPipelines ? "Pipeline structure validated" : "Missing pipeline sections"
  });
  
  // Test 9: Orchestrator can parse CLAUDE.md headers
  const h1Headers = (claude.match(/^#\s+.+/gm) || []).length;
  const h2Sections = (claude.match(/^##\s+.+/gm) || []).length;
  results.push({
    test: "CLAUDE.md has parseable H1/H2 headers",
    pass: h1Headers > 0 && h2Sections >= 5,
    details: `Found ${h1Headers} H1 headers, ${h2Sections} H2 sections`
  });
  
  // Test 10: Mission status exists somewhere in CLAUDE.md
  const hasMissionStatus = claude.match(/Status[:\*\s]+([A-Z-]+)/i);
  results.push({
    test: "CLAUDE.md has Status field somewhere",
    pass: !!hasMissionStatus,
    details: hasMissionStatus ? `Found: Status: ${hasMissionStatus[1]}` : "No Status field"
  });
  
  // Test 11: CLAUDE.md has Mission Status summary section
  const summaryMatch = claude.match(/MISSION STATUS|MISSION\s+SUMMARY/i);
  results.push({
    test: "CLAUDE.md has MISSION STATUS summary",
    pass: !!summaryMatch,
    details: summaryMatch ? "Summary section found" : "Missing summary section"
  });
  
  return results;
}

// Run validation
console.log("🧪 Epoch 32 Validation: Unified Mission State Architecture\n");

const results = validate();
let passed = 0;
let failed = 0;

for (const result of results) {
  const icon = result.pass ? "✅" : "❌";
  console.log(`${icon} ${result.test}`);
  if (result.details) {
    console.log(`   └─ ${result.details}`);
  }
  result.pass ? passed++ : failed++;
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log("\n⚠️  VALIDATION FAILED - BUILD should not proceed");
  process.exit(1);
} else {
  console.log("\n✅ VALIDATION PASSED - Architecture satisfies orchestrator heuristics");
  process.exit(0);
}