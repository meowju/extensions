# Epoch 38: XL-41 Integration Test Architecture

## Mission
Create comprehensive integration test validating MeowGateway + Agent flow.

## Scope
- MeowGateway WebSocket server lifecycle
- Token authentication flow
- Prompt → Agent → Result payload chain
- Error handling for malformed messages

## Verification Criteria
1. `dogfood/integration-meowgateway-agent.test.ts` exists
2. All test cases pass (≥8 test cases)
3. WebSocket connection lifecycle validated
4. Agent response latency < 5 seconds

## Components to Test

### 1. Gateway Startup
- Server starts on configured port
- Health endpoint responds

### 2. WebSocket Connection
- Client connects via ws:// protocol
- Invalid token rejected
- Valid token accepted
- Connection closed on invalid message

### 3. Message Flow
- PROMPT message triggers agent processing
- Agent reasoning completes
- RESULT payload delivered to client

### 4. Error Handling
- Malformed JSON rejected
- Unknown message types handled gracefully
- Timeout scenarios handled

## Test Structure
```typescript
describe("XL-41: MeowGateway + Agent Integration", () => {
  test("Gateway starts and accepts connections")
  test("Token auth rejects invalid tokens")
  test("Token auth accepts valid tokens")
  test("Prompt triggers agent processing")
  test("Agent reasoning completes within timeout")
  test("Result payload delivered to client")
  test("Error messages handled gracefully")
  test("Connection cleanup on client disconnect")
})
```

## Technical Approach
- Use `ws` library for WebSocket client testing
- Mock MeowAgentClient for isolated testing
- In-process server startup for fast tests
- Timeout assertions for latency verification

## Success Criteria
- 8+ test cases pass
- No timeout failures
- Clean connection lifecycle