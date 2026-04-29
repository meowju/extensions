/**
 * V3.4 Integration Test - MeowGateway Live Test
 * Tests the full PROMPT → RESULT flow with real agent responses
 * 
 * Run: node src/gateway/v34-integration-test.cjs
 */

const { WebSocket } = require('ws');

const GATEWAY_URL = 'ws://localhost:8080/?token=dev-token-change-me';
const TEST_TIMEOUT = 30000;

async function runTest() {
  console.log('🧪 V3.4 MeowGateway Integration Test');
  console.log('=====================================\n');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(GATEWAY_URL);
    let authenticated = false;
    let testPhase = 'CONNECT';

    const timeout = setTimeout(() => {
      console.error('❌ TIMEOUT - Test took too long');
      ws.close();
      reject(new Error('Test timeout'));
    }, TEST_TIMEOUT);

    ws.on('open', () => {
      console.log('[✓] WebSocket Connected');
      testPhase = 'AUTH';
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      console.log(`[MSG] ${msg.type}:`, JSON.stringify(msg.payload || msg).substring(0, 80));

      if (msg.type === 'AUTH_RESPONSE' && msg.payload?.success) {
        authenticated = true;
        console.log('[✓] Authentication successful');
        testPhase = 'PROMPT';
        
        // Send test prompt
        ws.send(JSON.stringify({
          type: 'PROMPT',
          id: 'v34-test-1',
          timestamp: Date.now(),
          payload: { text: 'What is 2+2?' }
        }));
        console.log('[→] Sent test prompt');
      }

      if (msg.type === 'RESULT') {
        console.log('\n✅ V3.4 INTEGRATION SUCCESS');
        console.log('   Agent responded with:', msg.payload.content?.substring(0, 100));
        console.log('   Iterations:', msg.payload.agentResult?.iterations);
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      }

      if (msg.type === 'ERROR') {
        console.error('\n❌ Error received:', msg.payload.message);
        clearTimeout(timeout);
        ws.close();
        reject(new Error(msg.payload.message));
      }
    });

    ws.on('error', (e) => {
      console.error('[!] WebSocket error:', e.message);
      clearTimeout(timeout);
      reject(e);
    });

    ws.on('close', () => {
      console.log('[✓] Connection closed');
      if (!authenticated) {
        clearTimeout(timeout);
        reject(new Error('Not authenticated before close'));
      }
    });
  });
}

runTest()
  .then(() => {
    console.log('\n📊 V3.4 DOGFOOD: PASSED ✅');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n📊 V3.4 DOGFOOD: FAILED ❌', err.message);
    process.exit(1);
  });