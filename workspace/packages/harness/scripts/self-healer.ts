/**
 * self-healer.ts
 *
 * The immune system response script.
 * If drift is detected, it automatically patches JOB.md to force a refactor.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const REPORT_PATH = join(PROJECT_ROOT, 'packages/harness/DRIFT_REPORT.json');
const BLOAT_REPORT_PATH = join(PROJECT_ROOT, 'packages/harness/BLOAT_REPORT.json');
const JOB_PATH = join(PROJECT_ROOT, 'packages/harness/JOB.md');

function selfHeal() {
  console.log('🧬 Initiating Self-Healing Protocol...');

  // 1. Run Drift & Bloat Checks
  let infected = false;
  try {
    execSync('bun run packages/harness/scripts/drift-check.ts', { stdio: 'inherit' });
  } catch (e) {
    console.warn('🚨 Logic Drift detected.');
    infected = true;
  }

  try {
    execSync('bun run packages/harness/scripts/bloat-shield.ts', { stdio: 'inherit' });
  } catch (e) {
    console.warn('🚨 Codebase Bloat detected.');
    infected = true;
  }

  if (!infected) {
    console.log('✅ Immune system reports no infection.');
    return;
  }

  // 2. Read Reports
  let twins: string[] = [];
  let bloat: string[] = [];

  if (existsSync(REPORT_PATH)) {
    const report = JSON.parse(readFileSync(REPORT_PATH, 'utf-8'));
    twins = Object.keys(report.twins);
  }

  if (existsSync(BLOAT_REPORT_PATH)) {
    const report = JSON.parse(readFileSync(BLOAT_REPORT_PATH, 'utf-8'));
    bloat = [...report.orphans, ...report.obese_files];
  }

  // 3. Patch JOB.md
  if (!existsSync(JOB_PATH)) return;
  let jobContent = readFileSync(JOB_PATH, 'utf-8');

  let tasks = [];
  if (twins.length > 0) tasks.push(`Consolidate logic twins: ${twins.join(', ')}`);
  if (bloat.length > 0) tasks.push(`Purge/Refactor bloat: ${bloat.slice(0, 3).join(', ')}...`);

  if (tasks.length === 0) return;

  const healingTask = `
| P0       | HEAL ARCHITECTURE | ${tasks.join('. ')} | ACTIVE |
`.trim();

  // If already healing, don't duplicate
  if (jobContent.includes('HEAL ARCHITECTURE')) {
    console.log('⏳ Healing mission already active. Monitoring progress...');
    return;
  }

  // Inject at the top of the backlog
  const lines = jobContent.split('\n');
  const backlogIndex = lines.findIndex(l => l.includes('Backlog Candidates') || l.includes('MISSION:'));
  
  if (backlogIndex !== -1) {
    lines.splice(backlogIndex + 2, 0, healingTask);
    writeFileSync(JOB_PATH, lines.join('\n'));
    console.log(`🌸 Self-healed JOB.md: Added consolidation task for [${twins.join(', ')}]`);
  }
}

try {
  selfHealer();
} catch (err) {
  // Silent fail - don't crash the main loop
}

function selfHealer() {
  selfHeal();
}
