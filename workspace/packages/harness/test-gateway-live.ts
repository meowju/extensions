/**
 * Live Integration Test: MeowGateway PROMPT → RESULT
 * 
 * Uses Bun's native WebSocket (available globally in Bun runtime)
 */

import { MeowGateway } from "./src/gateway/meow-gateway";
import { createMessage, serializeMessage, parseMessage } from "./src/gateway/protocol";

const GATEWAY_TOKEN = "dev-token-change-me";
const TEST_PROMPT = "Hello, respond with 'Meow!' if you can hear me.";

async function runLiveTest(): Promise<boolean> {
  console.log("[test] Starting MeowGateway live integration test...\n");
  
  // Start gateway on port 0 for auto-assignment
  const gateway = new MeowGateway({ port: 0 });
  await gateway.start();
  
  const { port } = gateway;
  console.log(`[test] Gateway started on port ${port}`);
  
  // Connect using Bun's native WebSocket
  const wsUrl = `ws://localhost:${port}?token=${GATEWAY_TOKEN}`;
  console.log(`[test] Connecting to ${wsUrl}...`);
  
  const ws = new WebSocket(wsUrl);
  
  let testPassed = false;
  
  ws.onopen = () => {
    console.log("[test] WebSocket connected");
  };
  
  ws.onmessage = (event: MessageEvent) => {
    const data = event.data;
    const message = parseMessage(typeof data === 'string' ? data : new TextDecoder().decode(data));
    console.log(`[test] ← Received: ${message.type}`);
    
    if (message.type === "AUTH_REQUEST") {
      // Respond with token
      ws.send(serializeMessage(createMessage("AUTH_REQUEST", {
        token: GATEWAY_TOKEN
      })));
    } else if (message.type === "AUTH_RESPONSE") {
      const payload = message.payload as { success: boolean };
      if (payload.success) {
        console.log("[test] ✓ Authenticated successfully");
        
        // Send test prompt
        console.log(`[test] Sending: "${TEST_PROMPT}"`);
        ws.send(serializeMessage(createMessage("PROMPT", { text: TEST_PROMPT })));
      }
    } else if (message.type === "STATUS") {
      console.log(`[test]   Status: ${(message.payload as { message: string }).message}`);
    } else if (message.type === "RESULT") {
      const payload = message.payload as { success: boolean; content?: string; agentResult?: { iterations: number } };
      console.log(`[test] ✓ RESULT received:`);
      console.log(`       Success: ${payload.success}`);
      console.log(`       Content: ${(payload.content || "").substring(0, 100)}...`);
      if (payload.agentResult) {
        console.log(`       Iterations: ${payload.agentResult.iterations}`);
      }
      testPassed = payload.success;
      ws.close();
      gateway.shutdown();
    } else if (message.type === "ERROR") {
      console.log(`[test] ✗ ERROR: ${(message.payload as { message: string }).message}`);
      ws.close();
      gateway.shutdown();
    }
  };
  
  ws.onclose = () => {
    console.log(`\n[test] Connection closed`);
    console.log(`[test] RESULT: ${testPassed ? "✓ PASS" : "✗ FAIL"}`);
  };
  
  ws.onerror = (err: Event) => {
    console.error(`[test] ✗ WebSocket error:`, err);
    gateway.shutdown();
  };
  
  // Wait for test completion (with timeout)
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      if (!testPassed) {
        console.log("[test] ✗ TIMEOUT - No RESULT received");
        ws.close();
        gateway.shutdown();
      }
      resolve();
    }, 30000);
  });
  
  return testPassed;
}

// Run as main module
if (import.meta.main) {
  runLiveTest()
    .then((passed) => process.exit(passed ? 0 : 1))
    .catch((err) => {
      console.error("[test] Fatal error:", err);
      process.exit(1);
    });
}

export { runLiveTest };
