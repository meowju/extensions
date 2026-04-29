/**
 * MeowGateway - Modular WebSocket Server Class
 * 
 * Platform sovereignty achievement: Universal WebSocket interface for Meow access.
 * This class can be instantiated for testing or extended for custom deployments.
 */

import {
  type GatewayMessage,
  type PromptPayload,
  type ResultPayload,
  type StatusPayload,
  type HeartbeatPayload,
  createMessage,
  serializeMessage,
  parseMessage,
  generateMessageId,
} from "./protocol";
import { MeowAgentClient, type AgentResult } from "../core/meow-agent";

// ============================================================================
// Types
// ============================================================================

export interface GatewayConfig {
  port?: number;
  host?: string;
  tokenSecret?: string;
  workspaceRoot?: string;
}

export interface GatewayMetrics {
  uptime: number;
  clientCount: number;
  messagesProcessed: number;
}

export interface ConnectedClient {
  id: string;
  ws: WebSocket;
  authenticated: boolean;
  connectedAt: number;
  lastHeartbeat: number;
  name?: string;
}

// ============================================================================
// MeowGateway Class
// ============================================================================

export class MeowGateway {
  public readonly port: number;
  public readonly host: string;
  public readonly tokenSecret: string;
  public readonly workspaceRoot: string;
  public readonly clients: ConnectedClient[] = [];
  
  private server: ReturnType<typeof Bun.serve> | null = null;
  private meowAgent: MeowAgentClient | null = null;
  private startTime: number = Date.now();
  private messageCount: number = 0;
  
  constructor(config: GatewayConfig = {}) {
    this.port = config.port ?? (parseInt(process.env.GATEWAY_PORT || "8080") || 8080);
    // If port is 0, auto-assign a random port (unless we're just testing config)
    if (this.port === 0 && config.port === 0) {
      this.port = 3000 + Math.floor(Math.random() * 10000);
    }
    this.host = config.host ?? (process.env.GATEWAY_HOST || "0.0.0.0");
    this.tokenSecret = config.tokenSecret ?? (process.env.GATEWAY_TOKEN || "dev-token-change-me");
    this.workspaceRoot = config.workspaceRoot ?? process.cwd();
  }
  
  // ============================================================================
  // Token Validation
  // ============================================================================
  
  validateToken(token: string): boolean {
    return token === this.tokenSecret;
  }
  
  // ============================================================================
  // Message Handling
  // ============================================================================
  
  handleMessage(message: string, clientId: string): GatewayMessage | null {
    this.messageCount++;
    return parseMessage(message);
  }
  
  // ============================================================================
  // Broadcasting
  // ============================================================================
  
  broadcast(message: GatewayMessage, excludeId?: string): void {
    const data = serializeMessage(message);
    for (const client of this.clients) {
      if (client.id !== excludeId && client.authenticated && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }
  
  // ============================================================================
  // Agent Integration
  // ============================================================================
  
  private getAgent(): MeowAgentClient {
    if (!this.meowAgent) {
      this.meowAgent = new MeowAgentClient();
    }
    return this.meowAgent;
  }
  
  async processPrompt(text: string, sourceClientId: string): Promise<ResultPayload> {
    const messageId = generateMessageId();
    
    // Get agent result
    const agent = this.getAgent();
    const result: AgentResult = await agent.promptJson(text);
    
    this.messageCount++;
    
    return {
      messageId,
      content: result.content,
      success: result.completed,
      agentResult: {
        iterations: result.iterations,
        toolCalls: result.messages?.reduce((count, msg) => {
          return count + (msg.tool_calls?.length || 0);
        }, 0) || 0,
        usage: result.usage ? {
          inputTokens: result.usage.promptTokens,
          outputTokens: result.usage.completionTokens,
        } : undefined,
      },
    };
  }
  
  // ============================================================================
  // Lifecycle
  // ============================================================================
  
  async start(): Promise<void> {
    const server = Bun.serve<{ clientId: string }>({
      port: this.port,
      hostname: this.host,
      
      fetch: (req, srv) => {
        const url = new URL(req.url);
        const upgrade = req.headers.get("upgrade");
        
        if (upgrade === "websocket") {
          const token = req.headers.get("x-gateway-token") || url.searchParams.get("token");
          
          if (!token || token !== this.tokenSecret) {
            return new Response("Unauthorized", { status: 401 });
          }

          const clientId = this.generateClientId();
          const success = srv.upgrade(req, {
            data: { clientId },
            headers: { "X-Gateway-Client-Id": clientId },
          });

          return success ? undefined : new Response("WebSocket upgrade failed", { status: 500 });
        }

        // HTTP endpoints
        if (url.pathname === "/health") {
          return Response.json({ 
            status: "ok", 
            clients: this.clients.length, 
            uptime: this.getUptime(),
            agentReady: this.getAgent().isAlive(),
          });
        }

        if (url.pathname === "/" || url.pathname === "/dashboard") {
          const token = url.searchParams.get("token");
          return new Response(this.getDashboardHTML(token), {
            headers: { "Content-Type": "text/html" },
          });
        }

        return new Response("MeowGateway WebSocket Server", { 
          headers: { "Content-Type": "text/plain" } 
        });
      },

      websocket: {
        open: (ws) => this.handleOpen(ws),
        message: (ws, message) => this.handleMessage(ws, message),
        close: (ws, code, reason) => this.handleClose(ws, code, reason),
        perMessageDeflate: true,
      },
    });
    
    this.server = server;
    this.startTime = Date.now();
    console.log(`[gateway] MeowGateway listening on ws://${this.host}:${this.port}`);
  }
  
  shutdown(): void {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }
  
  // ============================================================================
  // WebSocket Handlers
  // ============================================================================
  
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  
  private handleOpen(ws: WebSocket & { data: { clientId: string } }): void {
    const { clientId } = ws.data;
    console.log(`[gateway] Client ${clientId} connected`);
    
    this.clients.push({
      id: clientId, 
      ws, 
      authenticated: false,
      connectedAt: Date.now(), 
      lastHeartbeat: Date.now(),
    });

    ws.send(serializeMessage(createMessage("AUTH_REQUEST", {
      message: "Welcome to MeowGateway! Please authenticate.",
      tokenLength: this.tokenSecret.length,
    })));
  }
  
  private handleMessage(ws: WebSocket & { data: { clientId: string } }, message: string | Buffer): void {
    const { clientId } = ws.data;
    const client = this.clients.find(c => c.id === clientId);
    if (!client) return;

    const msg = parseMessage(message.toString());
    if (!msg) {
      ws.send(serializeMessage(createMessage("ERROR", { 
        code: "INVALID_MESSAGE", 
        message: "Failed to parse message" 
      })));
      return;
    }

    this.messageCount++;
    client.lastHeartbeat = Date.now();

    switch (msg.type) {
      case "AUTH_REQUEST":
        this.handleAuth(clientId, msg.payload as { token: string });
        break;
      case "PROMPT":
        if (!client.authenticated) {
          ws.send(serializeMessage(createMessage("ERROR", { 
            code: "NOT_AUTHENTICATED", 
            message: "Please authenticate first" 
          })));
          return;
        }
        this.routePrompt(msg.payload as PromptPayload, clientId);
        break;
      case "HEARTBEAT":
      case "SWARM_REPORT":
        this.broadcast(msg, clientId);
        break;
    }
  }
  
  private handleClose(ws: WebSocket & { data: { clientId: string } }, code: number, reason: Buffer): void {
    const { clientId } = ws.data;
    const idx = this.clients.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      console.log(`[gateway] Client ${clientId} disconnected`);
      this.clients.splice(idx, 1);
    }
  }
  
  private handleAuth(clientId: string, payload: { token: string }): void {
    const client = this.clients.find(c => c.id === clientId);
    if (!client) return;

    if (payload.token === this.tokenSecret) {
      client.authenticated = true;
      client.ws.send(serializeMessage(createMessage("AUTH_RESPONSE", {
        success: true, 
        message: "Authenticated!", 
        clientId,
      })));
      console.log(`[gateway] Client ${clientId} authenticated`);
    } else {
      client.ws.send(serializeMessage(createMessage("AUTH_RESPONSE", { 
        success: false, 
        message: "Invalid token" 
      })));
      client.ws.close(4003, "Invalid token");
    }
  }
  
  private async routePrompt(prompt: PromptPayload, sourceClientId: string): Promise<void> {
    const client = this.clients.find(c => c.id === sourceClientId);
    if (!client) return;
    
    const messageId = generateMessageId();
    
    // Send thinking status
    client.ws.send(serializeMessage(createMessage("STATUS", {
      agent: "meow",
      state: "thinking",
      message: "Processing prompt...",
      progress: 10,
    } as StatusPayload, { id: messageId })));

    try {
      const result = await this.processPrompt(prompt.text, sourceClientId);
      client.ws.send(serializeMessage(createMessage("RESULT", result, { id: messageId })));
      
      console.log(`[gateway] ✓ Prompt completed (${result.agentResult.iterations} iterations, ${result.agentResult.toolCalls} tools)`);
    } catch (error: any) {
      console.error(`[gateway] Agent error: ${error.message}`);
      client.ws.send(serializeMessage(createMessage("ERROR", {
        code: "AGENT_ERROR",
        message: error.message || "Unknown error",
        originalMessageId: messageId,
      })));
    }
  }
  
  // ============================================================================
  // Metrics & Utilities
  // ============================================================================
  
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
  
  getMetrics(): GatewayMetrics {
    return {
      uptime: this.getUptime(),
      clientCount: this.clients.length,
      messagesProcessed: this.messageCount,
    };
  }
  
  isRunning(): boolean {
    return this.server !== null;
  }
  
  private getDashboardHTML(token: string | null): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MeowGateway</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #ff6b9d; margin-bottom: 20px; }
    .status { display: flex; gap: 20px; margin-bottom: 20px; }
    .stat { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; }
    .stat-label { font-size: 12px; color: #888; }
    .stat-value { font-size: 20px; font-weight: bold; }
    .connected { color: #4ade80; }
    .chat { background: rgba(255,255,255,0.05); border-radius: 12px; height: 400px; display: flex; flex-direction: column; }
    .messages { flex: 1; overflow-y: auto; padding: 15px; }
    .msg { background: rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; margin-bottom: 10px; max-width: 80%; }
    .msg.user { margin-left: auto; background: rgba(99,102,241,0.3); }
    .msg.system { text-align: center; color: #888; max-width: 100%; }
    .msg.meow { background: rgba(255,107,157,0.2); }
    .input-area { padding: 15px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 10px; }
    input { flex: 1; background: rgba(255,255,255,0.1); border: none; border-radius: 8px; padding: 12px; color: #fff; }
    button { background: linear-gradient(135deg, #ff6b9d, #c44569); border: none; border-radius: 8px; padding: 12px 25px; color: #fff; font-weight: bold; cursor: pointer; }
    button:disabled { opacity: 0.5; }
    pre { white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🐱 MeowGateway Dashboard</h1>
    <div class="status">
      <div class="stat"><div class="stat-label">Connection</div><div id="status" class="stat-value" style="color:#f87171">Disconnected</div></div>
      <div class="stat"><div class="stat-label">Uptime</div><div id="uptime" class="stat-value">-</div></div>
      <div class="stat"><div class="stat-label">Messages</div><div id="count" class="stat-value">0</div></div>
    </div>
    <div class="chat">
      <div id="messages" class="messages"><div class="msg system">Connecting...</div></div>
      <div class="input-area">
        <input id="input" placeholder="Send a prompt..." disabled>
        <button id="send" disabled>Send</button>
      </div>
    </div>
  </div>
  <script>
    const token = "${token || ''}";
    const wsUrl = token ? \`ws://\${location.host}?token=\${token}\` : null;
    const msgs = document.getElementById('messages');
    const input = document.getElementById('input');
    const send = document.getElementById('send');
    const status = document.getElementById('status');
    const uptime = document.getElementById('uptime');
    const count = document.getElementById('count');
    let countVal = 0;
    let ws;

    function add(type, html) {
      const d = document.createElement('div');
      d.className = 'msg ' + type;
      d.innerHTML = html;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function connect() {
      if (!wsUrl) { add('system', 'No token - add ?token=YOUR_TOKEN'); return; }
      ws = new WebSocket(wsUrl);
      ws.onopen = () => { status.textContent = 'Connected'; status.className = 'stat-value connected'; input.disabled = false; send.disabled = false; add('system', 'Connected!'); };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === 'AUTH_RESPONSE') add('system', m.payload.success ? '✓ Authenticated' : '✗ Auth failed');
        else if (m.type === 'STATUS' && m.payload.agent === 'system') uptime.textContent = m.payload.message.replace('Gateway uptime: ', '');
        else if (m.type === 'RESULT') { countVal++; count.textContent = countVal; add('meow', '<pre>' + m.payload.content + '</pre>'); }
        else if (m.type === 'ERROR') add('system', '<span style="color:#f87171">Error: ' + m.payload.message + '</span>');
      };
      ws.onclose = () => { status.textContent = 'Disconnected'; status.className = 'stat-value'; input.disabled = true; send.disabled = true; add('system', 'Reconnecting...'); setTimeout(connect, 3000); };
    }

    send.onclick = () => {
      const t = input.value.trim();
      if (!t || !ws || ws.readyState !== 1) return;
      add('user', '<pre>' + t + '</pre>');
      ws.send(JSON.stringify({ type: 'PROMPT', id: 'p-' + Date.now(), timestamp: Date.now(), payload: { text: t } }));
      input.value = '';
    };
    input.onkeypress = (e) => { if (e.key === 'Enter') send.click(); };
    connect();
  </script>
</body>
</html>`;
  }
}

// ============================================================================
// Standalone Server Entry Point
// ============================================================================

if (import.meta.main) {
  const gateway = new MeowGateway();
  
  // Graceful shutdown
  process.on("SIGINT", () => { console.log("\n[gateway] Shutting down..."); gateway.shutdown(); process.exit(0); });
  process.on("SIGTERM", () => { console.log("\n[gateway] Shutting down..."); gateway.shutdown(); process.exit(0); });
  
  gateway.start().catch(console.error);
}