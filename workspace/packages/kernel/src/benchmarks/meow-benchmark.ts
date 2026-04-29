/**
 * Meow Effectiveness Benchmark
 *
 * Simple benchmark to measure Meow's coding effectiveness using MiniMax-M2.7.
 * Inspired by Aider's polyglot benchmark but simplified for lean evaluation.
 *
 * Run: bun run src/benchmarks/meow-benchmark.ts
 */

import { runLeanAgent } from "../core/lean-agent.ts";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(process.cwd(), "test-benchmark");
const API_KEY = process.env.LLM_API_KEY || "";
const BASE_URL = process.env.LLM_BASE_URL || "https://api.minimax.io/v1";
const MODEL = process.env.LLM_MODEL || "MiniMax-M2.7";

// ============================================================================
// Benchmark Tasks (simplified Exercism-style)
// ============================================================================

interface BenchmarkTask {
  name: string;
  prompt: string;
  validate: (output: string, files: Map<string, string>) => { pass: boolean; reason: string };
}

const TASKS: BenchmarkTask[] = [
  {
    name: "hello-world",
    prompt: `Create a file called ${TEST_DIR}/hello.py with a function hello() that returns "Hello, World!"`,
    validate: (_output, files) => {
      const content = files.get("hello.py");
      if (!content) return { pass: false, reason: "hello.py not created" };
      if (!content.includes("Hello, World!")) return { pass: false, reason: "Missing greeting" };
      return { pass: true, reason: "OK" };
    }
  },
  {
    name: "two-sum",
    prompt: `Create ${TEST_DIR}/two_sum.py with a function two_sum(nums, target) that returns indices of two numbers that add to target. Example: two_sum([2,7,11,15], 9) should return [0,1]`,
    validate: (_output, files) => {
      const content = files.get("two_sum.py");
      if (!content) return { pass: false, reason: "two_sum.py not created" };
      if (!content.includes("def two_sum")) return { pass: false, reason: "Missing function definition" };
      return { pass: true, reason: "OK" };
    }
  },
  {
    name: "fizzbuzz",
    prompt: `Create ${TEST_DIR}/fizzbuzz.py with a function fizzbuzz(n) that returns "Fizz" for multiples of 3, "Buzz" for 5, "FizzBuzz" for 15, else the number as a string`,
    validate: (_output, files) => {
      const content = files.get("fizzbuzz.py");
      if (!content) return { pass: false, reason: "fizzbuzz.py not created" };
      if (!content.includes("def fizzbuzz")) return { pass: false, reason: "Missing function" };
      return { pass: true, reason: "OK" };
    }
  },
  {
    name: "palindrome",
    prompt: `Create ${TEST_DIR}/palindrome.py with a function is_palindrome(s) that returns true if s is a palindrome (case-insensitive, ignoring spaces)`,
    validate: (_output, files) => {
      const content = files.get("palindrome.py");
      if (!content) return { pass: false, reason: "palindrome.py not created" };
      if (!content.includes("def is_palindrome")) return { pass: false, reason: "Missing function" };
      return { pass: true, reason: "OK" };
    }
  },
  {
    name: "reverse-string",
    prompt: `Create ${TEST_DIR}/reverse.py with a function reverse_string(s) that returns the reverse of string s`,
    validate: (_output, files) => {
      const content = files.get("reverse.py");
      if (!content) return { pass: false, reason: "reverse.py not created" };
      if (!content.includes("def reverse_string")) return { pass: false, reason: "Missing function" };
      return { pass: true, reason: "OK" };
    }
  },
];

// ============================================================================
// Benchmark Runner
// ============================================================================

async function runBenchmark() {
  if (!API_KEY) {
    console.error("❌ LLM_API_KEY not configured");
    process.exit(1);
  }

  console.log("🚀 Meow Effectiveness Benchmark");
  console.log(`   Model: ${MODEL}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Tasks: ${TASKS.length}`);
  console.log("");

  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }

  const results: { task: string; pass: boolean; reason: string; time: number }[] = [];

  for (const task of TASKS) {
    console.log(`📋 Running: ${task.name}...`);
    const start = Date.now();

    try {
      // Clean up any existing files
      const existingFiles = new Map<string, string>();
      for (const f of [task.name.split("-")[0] + ".py"]) {
        const path = join(TEST_DIR, f.replace(task.name.split("-")[0], task.name.split("-")[0]));
        if (existsSync(path)) {
          existingFiles.set(f, readFileSync(path, "utf-8"));
        }
      }

      const result = await runLeanAgent(task.prompt, {
        dangerous: true,
        maxIterations: 5,
        timeoutMs: 60000,
        apiKey: API_KEY,
        baseURL: BASE_URL,
        model: MODEL,
      });

      // Collect created files
      const files = new Map<string, string>();
      const possibleFiles = ["hello.py", "two_sum.py", "fizzbuzz.py", "palindrome.py", "reverse.py"];
      for (const f of possibleFiles) {
        const path = join(TEST_DIR, f);
        if (existsSync(path)) {
          files.set(f, readFileSync(path, "utf-8"));
        }
      }

      const validation = task.validate(result.content, files);
      const elapsed = Date.now() - start;

      results.push({
        task: task.name,
        pass: validation.pass,
        reason: validation.reason,
        time: elapsed,
      });

      console.log(`   ${validation.pass ? "✅ PASS" : "❌ FAIL"} (${elapsed}ms) - ${validation.reason}`);
    } catch (e: any) {
      const elapsed = Date.now() - start;
      results.push({
        task: task.name,
        pass: false,
        reason: `Error: ${e.message}`,
        time: elapsed,
      });
      console.log(`   ❌ ERROR (${elapsed}ms) - ${e.message}`);
    }
  }

  // Summary
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const passRate = Math.round((passed / total) * 100);

  console.log("\n" + "═".repeat(60));
  console.log("📊 BENCHMARK RESULTS");
  console.log("═".repeat(60));
  console.log(`   Pass Rate: ${passRate}% (${passed}/${total})`);
  console.log(`   Model: ${MODEL}`);
  console.log("");
  console.log("Task Breakdown:");
  for (const r of results) {
    console.log(`   ${r.pass ? "✅" : "❌"} ${r.task}: ${r.reason} (${r.time}ms)`);
  }
  console.log("═".repeat(60));

  // Save results
  const summary = {
    date: new Date().toISOString(),
    model: MODEL,
    passRate,
    passed,
    total,
    results,
  };

  writeFileSync(
    join(process.cwd(), `benchmark-results-${Date.now()}.json`),
    JSON.stringify(summary, null, 2)
  );

  return passRate >= 60 ? 0 : 1;
}

// Run if main
if (import.meta.main) {
  runBenchmark().then((code) => process.exit(code));
}
