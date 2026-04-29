import { test, expect } from "bun:test";

test("check module export behavior", async () => {
  const ss = await import("../src/core/session-store.ts");
  const keys = Object.keys(ss);
  console.log("Keys from Object.keys:", keys);
  console.log("'getSessionDir' in keys:", keys.includes('getSessionDir'));
  
  // Try different access patterns
  const directAccess = (ss as any).getSessionDir;
  console.log("Direct access (ss as any).getSessionDir:", directAccess);
  
  // Check property descriptors
  const descriptor = Object.getOwnPropertyDescriptor(ss, 'getSessionDir');
  console.log("Property descriptor:", descriptor);
  
  // Check own properties
  const ownKeys = Object.getOwnPropertyNames(ss);
  console.log("Own property names:", ownKeys);
  console.log("'getSessionDir' in ownKeys:", ownKeys.includes('getSessionDir'));
  
  expect(true).toBe(true);
});
