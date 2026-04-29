/**
 * drift-check.ts (V2 - Self-Healing Edition)
 *
 * Scans for architectural drift and outputs actionable DNA telemetry.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const PROJECT_ROOT = process.cwd();
const SRC_ROOT = join(PROJECT_ROOT, 'packages/harness/src');
const REPORT_PATH = join(PROJECT_ROOT, 'packages/harness/DRIFT_REPORT.json');

interface DriftReport {
  timestamp: string;
  twins: Record<string, string[]>;
  verdict: 'CLEAN' | 'INFECTED';
}

function findFiles(dir: string, ext: string[]): string[] {
  let results: string[] = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const path = join(dir, file);
      const stat = statSync(path);
      if (stat && stat.isDirectory()) {
        results = results.concat(findFiles(path, ext));
      } else if (ext.includes(extname(file))) {
        results.push(path);
      }
    }
  } catch (e) { /* ignore access errors */ }
  return results;
}

function checkDrift() {
  const fileMap = new Map<string, string[]>();
  const files = findFiles(SRC_ROOT, ['.ts', '.tsx']);
  const report: DriftReport = {
    timestamp: new Date().toISOString(),
    twins: {},
    verdict: 'CLEAN'
  };

  for (const file of files) {
    const name = basename(file, extname(file)).toLowerCase();
    // Ignore safe patterns
    if (name === 'index' || name.endsWith('.test') || name.endsWith('.spec')) continue;
    
    if (!fileMap.has(name)) {
      fileMap.set(name, []);
    }
    fileMap.get(name)!.push(file.replace(PROJECT_ROOT, ''));
  }

  for (const [name, paths] of fileMap.entries()) {
    if (paths.length > 1) {
      report.twins[name] = paths;
      report.verdict = 'INFECTED';
    }
  }

  // Self-Healing Output
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  
  if (report.verdict === 'INFECTED') {
    console.error(`🚨 ARCHITECTURAL DRIFT DETECTED: ${Object.keys(report.twins).length} logic twins found.`);
    process.exit(1);
  } else {
    console.log('✅ Architecture DNA is clean.');
    process.exit(0);
  }
}

checkDrift();
