import { test, expect } from "bun:test";

test("check session-store exports", async () => {
  const ss = await import("../src/core/session-store.ts");
  console.log("All exports:", Object.keys(ss));
  console.log("getSessionDir type:", typeof ss.getSessionDir);
  console.log("SESSION_DIR_OVERRIDE type:", typeof ss.SESSION_DIR_OVERRIDE);
  
  // Try calling it directly
  if (ss.getSessionDir) {
    console.log("getSessionDir() =", ss.getSessionDir());
  } else {
    console.log("getSessionDir is falsy:", ss.getSessionDir);
  }
  
  expect(true).toBe(true);
});
