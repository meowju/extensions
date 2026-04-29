/**
 * bloat-shield.ts
 *
 * A low-resource guard that detects and prevents codebase bloat.
 * Part of the Meowju Self-Sovereign Architecture.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const PROJECT_ROOT = process.cwd();
const SRC_ROOT = join(PROJECT_ROOT, 'packages/harness/src');
const BLOAT_REPORT_PATH = join(PROJECT_ROOT, 'packages/harness/BLOAT_REPORT.json');

const LINE_LIMIT = 800; // The "Lean 800" rule
const SIZE_LIMIT_MB = 1;

interface BloatReport {
  timestamp: string;
  orphans: string[];
  obese_files: string[];
  junk_files: string[];
  verdict: 'LEAN' | 'BLOATED';
}

function findFiles(dir: string): string[] {
  let results: string[] = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const path = join(dir, file);
      const stat = statSync(path);
      if (stat && stat.isDirectory()) {
        results = results.concat(findFiles(path));
      } else {
        results.push(path);
      }
    }
  } catch (e) {}
  return results;
}

function checkBloat() {
  console.log('🛡️  Activating Bloat Shield...');
  const allFiles = findFiles(SRC_ROOT);
  const report: BloatReport = {
    timestamp: new Date().toISOString(),
    orphans: [],
    obese_files: [],
    junk_files: [],
    verdict: 'LEAN'
  };

  const tsFiles = allFiles.filter(f => ['.ts', '.tsx'].includes(extname(f)));
  const importTable = new Set<string>();

  // 1. Build Import Table
  tsFiles.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    const matches = content.matchAll(/from\s+['"](.+?)['"]/g);
    for (const match of matches) {
      let imported = match[1];
      if (imported.startsWith('.')) {
        // Simple normalization for the sake of speed
        importTable.add(join(file, '..', imported).replace(PROJECT_ROOT, '').toLowerCase());
      }
    }
    
    // 2. Check Obesity
    const lines = content.split('\n').length;
    if (lines > LINE_LIMIT) {
      report.obese_files.push(`${file.replace(PROJECT_ROOT, '')} (${lines} lines)`);
    }
  });

  // 3. Find Orphans (files not in import table and not entry points)
  tsFiles.forEach(file => {
    const relative = file.replace(PROJECT_ROOT, '').toLowerCase();
    // Entry point exceptions
    if (relative.endsWith('index.ts') || relative.endsWith('server.ts') || relative.endsWith('main.ts')) return;
    
    // Check if any file imports this one
    let isImported = false;
    for (const imp of importTable) {
      if (relative.includes(imp.replace(/\\/g, '/'))) {
        isImported = true;
        break;
      }
    }

    if (!isImported) {
      report.orphans.push(file.replace(PROJECT_ROOT, ''));
    }
  });

  // 4. Find Junk (.log, .tmp, etc in src)
  allFiles.forEach(file => {
    if (['.log', '.tmp', '.temp', '.bak'].includes(extname(file))) {
      report.junk_files.push(file.replace(PROJECT_ROOT, ''));
    }
  });

  if (report.orphans.length > 0 || report.obese_files.length > 0 || report.junk_files.length > 0) {
    report.verdict = 'BLOATED';
  }

  writeFileSync(BLOAT_REPORT_PATH, JSON.stringify(report, null, 2));

  if (report.verdict === 'BLOATED') {
    console.warn(`🚨 BLOAT DETECTED: ${report.orphans.length} orphans, ${report.obese_files.length} obese files.`);
    process.exit(0); // Warning only for now, let self-healer decide
  } else {
    console.log('✨ Codebase is lean and mean.');
  }
}

checkBloat();
