const { WebSocket } = require('ws');
const ws = new WebSocket('ws://localhost:8080/?token=dev-token-change-me');
ws.on('open', () => console.log('Connected'));
ws.on('message', (d) => console.log('MSG:', d.toString().substring(0, 200)));
ws.on('error', (e) => console.error('Error:', e.message));
ws.on('close', () => { console.log('Closed'); process.exit(0); });
setTimeout(() => { console.log('Timeout'); ws.close(); process.exit(1); }, 10000);