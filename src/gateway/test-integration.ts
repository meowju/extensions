// V3.4 Integration Test: MeowGateway PROMPT → RESULT flow
// Test the WebSocket connection and message routing

const WEBSOCKET_URL = "ws://localhost:8080";
const TEST_TOKEN = "dev-token-change-me";

async function testGatewayFlow() {
  console.log("🔌 Connecting to MeowGateway...");
  
  const ws = new WebSocket(WEBSOCKET_URL);
  
  return new Promise((resolve, reject) => {
    let authed = false;
    
    ws.onopen = () => {
      console.log("✅ Connected to MeowGateway");
      console.log("🔐 Sending AUTH_REQUEST with test token...");
      ws.send(JSON.stringify({
        type: "AUTH_REQUEST",
        id: `auth-${Date.now()}`,
        timestamp: Date.now(),
        payload: { token: TEST_TOKEN }
      }));
    };
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("📨 Received:", msg.type, JSON.stringify(msg.payload || msg));
      
      if (msg.type === "AUTH_RESPONSE" && msg.payload?.success) {
        authed = true;
        console.log("✅ Authenticated successfully!");
        console.log("📤 Sending test PROMPT...");
        ws.send(JSON.stringify({
          type: "PROMPT",
          id: `prompt-${Date.now()}`,
          timestamp: Date.now(),
          payload: { 
            text: "Hello, MeowGateway! Test integration V3.4",
            options: { timeout: 30000 }
          }
        }));
      }
      
      if (msg.type === "RESULT") {
        console.log("🎉 RESULT received! Integration test PASSED!");
        console.log("Content:", msg.payload?.content?.substring(0, 200) + "...");
        ws.close();
        resolve(true);
      }
      
      if (msg.type === "ERROR") {
        console.log("❌ Error:", msg.message);
        reject(new Error(msg.message));
      }
    };
    
    ws.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
      reject(err);
    };
    
    ws.onclose = () => {
      console.log("🔌 Connection closed");
      if (!authed) {
        reject(new Error("Authentication failed"));
      }
    };
    
    // Timeout after 10 seconds
    setTimeout(() => {
      ws.close();
      reject(new Error("Timeout waiting for RESULT"));
    }, 10000);
  });
}

testGatewayFlow()
  .then(() => {
    console.log("\n✅ V3.4 INTEGRATION TEST PASSED");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ V3.4 INTEGRATION TEST FAILED:", err.message);
    console.error("Stack:", err.stack);
    process.exit(1);
  });