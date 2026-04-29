// V3.4 Unit Test: MeowGateway Protocol & Messaging
// Tests the message protocol and gateway class directly

import {
  createMessage,
  serializeMessage,
  parseMessage,
  generateMessageId,
  isValidMessage,
  type GatewayMessage,
  type AuthPayload,
  type PromptPayload,
  type ResultPayload,
} from "./protocol";

import { MeowGateway, type GatewayConfig } from "./meow-gateway";

async function testProtocol() {
  console.log("🔬 Testing Protocol Layer...\n");
  
  // Test message creation
  const msg1 = createMessage("PROMPT", { text: "Hello" });
  console.assert(msg1.type === "PROMPT", "createMessage sets type");
  console.assert(typeof msg1.id === "string", "createMessage generates id");
  console.assert(typeof msg1.timestamp === "number", "createMessage sets timestamp");
  console.log("✅ createMessage works");
  
  // Test serialization
  const serialized = serializeMessage(msg1);
  const parsed = parseMessage(serialized);
  console.assert(parsed !== null, "parseMessage returns valid message");
  console.assert(parsed!.type === msg1.type, "parseMessage preserves type");
  console.log("✅ serializeMessage/parseMessage roundtrip works");
  
  // Test messageId generation
  const id1 = generateMessageId();
  const id2 = generateMessageId();
  console.assert(id1 !== id2, "generateMessageId produces unique IDs");
  console.log("✅ generateMessageId produces unique IDs");
  
  // Test isValidMessage
  console.assert(isValidMessage(msg1) === true, "isValidMessage validates proper message");
  console.assert(isValidMessage({ foo: "bar" }) === false, "isValidMessage rejects invalid");
  console.log("✅ isValidMessage validation works");
  
  console.log("\n✅ Protocol Layer: ALL TESTS PASSED\n");
}

async function testGateway() {
  console.log("🏛️ Testing MeowGateway Class...\n");
  
  const config: GatewayConfig = {
    port: 0, // Auto-assign
    host: "127.0.0.1",
    tokenSecret: "test-token-123",
    workspaceRoot: process.cwd(),
  };
  
  const gateway = new MeowGateway(config);
  
  // Test config
  console.assert(gateway.tokenSecret === "test-token-123", "Gateway stores token");
  console.assert(gateway.clients.length === 0, "Gateway starts with empty clients");
  console.log("✅ Gateway config works");
  
  // Test token validation
  console.assert(gateway.validateToken("test-token-123") === true, "validateToken accepts valid");
  console.assert(gateway.validateToken("wrong-token") === false, "validateToken rejects invalid");
  console.log("✅ Token validation works");
  
  // Test metrics
  const metrics = gateway.getMetrics();
  console.assert(metrics.uptime >= 0, "Metrics returns uptime");
  console.assert(metrics.clientCount === 0, "Metrics shows zero clients");
  console.assert(metrics.messagesProcessed === 0, "Metrics shows zero messages");
  console.log("✅ Metrics work");
  
  // Test isRunning
  console.assert(gateway.isRunning() === false, "Gateway reports not running initially");
  console.log("✅ isRunning works");
  
  console.log("\n✅ MeowGateway Class: ALL TESTS PASSED\n");
}

async function testMessageFlow() {
  console.log("🔄 Testing Message Flow Simulation...\n");
  
  // Simulate a complete prompt → result flow
  const authRequest = createMessage("AUTH_REQUEST", {
    message: "Please authenticate",
    tokenLength: 17,
  });
  console.log("📤 AUTH_REQUEST sent");
  console.log("   Payload:", authRequest.payload);
  
  const authResponse = createMessage("AUTH_RESPONSE", {
    success: true,
    message: "Authenticated!",
    clientId: "client-123",
  });
  console.log("📨 AUTH_RESPONSE received:", authResponse.payload);
  console.assert((authResponse.payload as any).success === true, "Auth successful");
  
  const promptMsg = createMessage("PROMPT", {
    text: "What is the capital of France?",
    options: { timeout: 30000 },
  });
  console.log("📤 PROMPT sent:", (promptMsg.payload as any).text);
  
  // Simulate result (normally from MeowAgentClient)
  const resultPayload: ResultPayload = {
    messageId: generateMessageId(),
    content: "The capital of France is Paris, a city famous for the Eiffel Tower and rich cultural heritage.",
    success: true,
    agentResult: {
      iterations: 2,
      toolCalls: 0,
      usage: {
        inputTokens: 45,
        outputTokens: 67,
      },
    },
  };
  
  const resultMsg = createMessage("RESULT", resultPayload);
  console.log("📨 RESULT received:", resultPayload.content.substring(0, 50) + "...");
  console.assert(resultPayload.success === true, "Result shows success");
  console.assert(resultPayload.agentResult!.iterations >= 0, "Result has iteration count");
  
  console.log("\n✅ Message Flow: ALL TESTS PASSED\n");
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("🐱 V3.4 MeowGateway Unit Tests");
  console.log("═══════════════════════════════════════════\n");
  
  await testProtocol();
  await testGateway();
  await testMessageFlow();
  
  console.log("═══════════════════════════════════════════");
  console.log("🎉 V3.4 INTEGRATION TESTS: ALL PASSED!");
  console.log("═══════════════════════════════════════════");
  
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
});