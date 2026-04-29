/**
 * TypeScript Error Handling Patterns
 * Based on research findings from sovereign-agent architecture patterns
 * 
 * Patterns covered:
 * 1. Read-Only Filesystem Detection & Graceful Degradation
 * 2. OODA Metacognition Audit Trail
 * 3. Docker Sandbox with Host Fallback
 * 4. Governance Engine Permission System
 * 5. WebSocket Gateway Error Handling
 * 
 * @module error-handling/patterns
 */

// ============================================================================
// PATTERN 1: Read-Only Filesystem Detection & Graceful Degradation
// ============================================================================

import { access, constants, writeFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FilesystemStatus {
  isReadOnly: boolean;
  canWriteGit: boolean;
  lastChecked: number;
}

/**
 * Handles read-only filesystem detection and graceful degradation
 * for auto-commit operations in containerized/CI environments.
 * 
 * @example
 * ```typescript
 * const fsHandler = new ReadOnlyFilesystemHandler();
 * const result = await fsHandler.safeAutoCommit("feat: my feature", { logUncommitted: true });
 * if (!result.success) {
 *   console.log(`Skipped commit due to: ${result.reason}`);
 * }
 * ```
 */
export class ReadOnlyFilesystemHandler {
  public status: FilesystemStatus = {
    isReadOnly: false,
    canWriteGit: true,
    lastChecked: Date.now()
  };

  /**
   * Test filesystem write capability with non-destructive probe
   */
  async checkWritePermission(testPath: string = '.fs_test_write'): Promise<boolean> {
    try {
      await writeFile(testPath, 'test');
      await unlink(testPath);
      return true;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      // EACCES (13), EROFS (30), ENOENT (-2)
      return [13, 30, -2].includes(err.code as unknown as number);
    }
  }

  /**
   * Check if we can write to .git directory (critical for auto-commit)
   */
  async canWriteToGit(gitPath: string = '.git'): Promise<boolean> {
    try {
      const testLock = `${gitPath}/index.lock.test`;
      await writeFile(testLock, '');
      await unlink(testLock);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Comprehensive filesystem status check
   */
  async refreshStatus(): Promise<FilesystemStatus> {
    this.status = {
      isReadOnly: !(await this.checkWritePermission()),
      canWriteGit: await this.canWriteToGit(),
      lastChecked: Date.now()
    };
    return this.status;
  }

  /**
   * Safe auto-commit that gracefully degrades on read-only filesystem
   */
  async safeAutoCommit(
    message: string,
    options: { logUncommitted?: boolean } = {}
  ): Promise<{ success: boolean; reason?: string }> {
    await this.refreshStatus();

    // Pre-flight check: detect read-only filesystem
    if (this.status.isReadOnly) {
      console.log('[AutoCommit] Read-only filesystem detected, skipping commit');
      if (options.logUncommitted) {
        await this.logUncommittedChanges();
      }
      return { success: false, reason: 'READ_ONLY_FS' };
    }

    if (!this.status.canWriteGit) {
      console.log('[AutoCommit] Cannot write to .git directory');
      if (options.logUncommitted) {
        await this.logUncommittedChanges();
      }
      return { success: false, reason: 'GIT_WRITE_PROTECTED' };
    }

    // Attempt commit
    try {
      await execAsync('git add -A');
      await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`);
      console.log('[AutoCommit] Commit successful');
      return { success: true };
    } catch (error) {
      const err = error as Error & { code?: string };
      
      // Handle specific git errors gracefully
      if (err.message?.includes('nothing to commit')) {
        return { success: true }; // Nothing to commit is not an error
      }
      
      if (err.message?.includes('Your branch is ahead')) {
        return { success: true }; // Ahead of remote is not an error
      }

      console.error('[AutoCommit] Commit failed:', err.message);
      if (options.logUncommitted) {
        await this.logUncommittedChanges();
      }
      return { success: false, reason: 'GIT_ERROR' };
    }
  }

  /**
   * Log unstaged changes for manual recovery
   */
  private async logUncommittedChanges(logPath: string = '.uncommitted_changes.log'): Promise<void> {
    try {
      const status = await execAsync('git status --porcelain').catch(() => ({ stdout: '' }));
      const diff = await execAsync('git diff').catch(() => ({ stdout: '' }));
      const stagedDiff = await execAsync('git diff --staged').catch(() => ({ stdout: '' }));

      const log = `
# Uncommitted Changes (${new Date().toISOString()})
## Status:
${status.stdout || '(no changes)'}

## Unstaged Changes:
${diff.stdout || '(none)'}

## Staged Changes:
${stagedDiff.stdout || '(none)'}
`;
      await writeFile(logPath, log);
      console.log(`[AutoCommit] Uncommitted changes logged to ${logPath}`);
    } catch {
      console.warn('[AutoCommit] Could not write change log');
    }
  }
}


// ============================================================================
// PATTERN 2: OODA Metacognition Audit Trail
// ============================================================================

export interface OODARecord {
  epoch: number;
  observe: string;      // What was observed
  orient: string;       // How it was interpreted
  decide: string;      // What decision was made
  act: string;         // What action was taken
  timestamp: number;
  tags?: string[];
}

export interface AuditContext {
  epoch: number;
  currentAction: string;
  priorActions: string[];
  environmentState: Record<string, unknown>;
}

/**
 * OODA (Observe-Orient-Decide-Act) metacognition audit trail
 * 
 * Implements the Observe-Orient-Decide-Act loop for agent reasoning
 * and attaches to DoneHooks for automatic audit logging.
 * 
 * @example
 * ```typescript
 * const audit = new OODAMetacognitionAudit();
 * const record = audit.createRecord(
 *   { epoch: 1, currentAction: 'WRITE', priorActions: [], environmentState: {} },
 *   'writeFile("config.yaml")',
 *   ['task-3']
 * );
 * console.log(`Decided: ${record.decide}`);
 * ```
 */
export class OODAMetacognitionAudit {
  private auditLog: OODARecord[] = [];
  private maxRecords: number;

  constructor(options: { maxRecords?: number } = {}) {
    this.maxRecords = options.maxRecords ?? 1000;
  }

  /**
   * Extract observations from context
   */
  private extractObservations(ctx: AuditContext): string {
    const recentActions = ctx.priorActions.slice(-3).join(' → ');
    return `Epoch ${ctx.epoch}: ${recentActions || 'Initial state'}`;
  }

  /**
   * Analyze orientation based on patterns
   */
  private analyzeOrientation(ctx: AuditContext): string {
    const actionCount = ctx.priorActions.length;
    if (actionCount === 0) return 'Initial orientation - no prior context';
    if (actionCount < 3) return 'Building context - patterns emerging';
    if (actionCount < 10) return 'Established context - clear direction';
    return 'Deep context - refined decision making';
  }

  /**
   * Make a decision based on context
   */
  private decideAction(ctx: AuditContext, proposedAction: string): string {
    // Simple decision logic - could be extended with ML
    if (proposedAction.includes('WRITE') && ctx.environmentState['readonly']) {
      return `DEFERRING: ${proposedAction} - filesystem is read-only`;
    }
    if (proposedAction.includes('COMMIT') && !ctx.environmentState['gitWritable']) {
      return `DEFERRING: ${proposedAction} - git directory protected`;
    }
    return `PROCEEDING: ${proposedAction}`;
  }

  /**
   * Create an audit record for an action
   */
  createRecord(
    ctx: AuditContext,
    act: string,
    tags?: string[]
  ): OODARecord {
    const record: OODARecord = {
      epoch: ctx.epoch,
      observe: this.extractObservations(ctx),
      orient: this.analyzeOrientation(ctx),
      decide: this.decideAction(ctx, act),
      act,
      timestamp: Date.now(),
      tags
    };

    this.auditLog.push(record);

    // Trim if exceeding max
    if (this.auditLog.length > this.maxRecords) {
      this.auditLog = this.auditLog.slice(-this.maxRecords);
    }

    return record;
  }

  /**
   * Get recent audit trail
   */
  getRecentRecords(count: number = 10): OODARecord[] {
    return this.auditLog.slice(-count);
  }

  /**
   * Get summary statistics
   */
  getStats(): { totalRecords: number; byEpoch: Record<number, number> } {
    const byEpoch: Record<number, number> = {};
    for (const record of this.auditLog) {
      byEpoch[record.epoch] = (byEpoch[record.epoch] ?? 0) + 1;
    }
    return { totalRecords: this.auditLog.length, byEpoch };
  }
}


// ============================================================================
// PATTERN 3: Docker Sandbox with Host Fallback
// ============================================================================

import { spawn, ChildProcess } from 'child_process';

export interface SandboxConfig {
  memory?: string;      // e.g., "512m"
  cpu?: string;         // e.g., "0.5"
  network?: 'bridge' | 'none' | 'host';
  timeout?: number;     // ms
  image?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionMode: 'docker' | 'host';
  duration: number;
}

/**
 * Docker sandbox executor with automatic fallback to host execution
 * 
 * Provides security isolation for untrusted code while gracefully
 * degrading when Docker is unavailable.
 * 
 * @example
 * ```typescript
 * const sandbox = new DockerSandboxExecutor({ memory: '256m', timeout: 10000 });
 * const result = await sandbox.execute('console.log("hello")');
 * console.log(`Executed in ${result.executionMode} mode`);
 * ```
 */
export class DockerSandboxExecutor {
  private config: SandboxConfig;
  private dockerAvailable: boolean | null = null;

  constructor(config: SandboxConfig = {}) {
    this.config = {
      memory: config.memory ?? '512m',
      cpu: config.cpu ?? '0.5',
      network: config.network ?? 'none',
      timeout: config.timeout ?? 30000,
      image: config.image ?? 'bun:latest'
    };
  }

  /**
   * Check if Docker is available
   */
  async isDockerAvailable(): Promise<boolean> {
    if (this.dockerAvailable !== null) return this.dockerAvailable;
    
    try {
      const result = await this.execCommand('docker', ['info'], 5000);
      this.dockerAvailable = result.exitCode === 0;
    } catch {
      this.dockerAvailable = false;
    }
    return this.dockerAvailable;
  }

  /**
   * Execute command with timeout
   */
  private execCommand(
    cmd: string,
    args: string[],
    timeout: number
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      const proc: ChildProcess = spawn(cmd, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');
      }, timeout);

      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code ?? (timedOut ? -1 : 0),
          executionMode: 'host',
          duration: Date.now() - start
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: err.message,
          exitCode: -1,
          executionMode: 'host',
          duration: Date.now() - start
        });
      });
    });
  }

  /**
   * Run command in Docker sandbox with automatic fallback
   */
  async execute(code: string): Promise<ExecutionResult> {
    const useDocker = await this.isDockerAvailable();

    if (!useDocker) {
      console.log('[Sandbox] Docker unavailable, executing on host');
      return this.executeOnHost(code);
    }

    try {
      return await this.executeInDocker(code);
    } catch (error) {
      console.log('[Sandbox] Docker execution failed, falling back to host');
      console.log('[Sandbox] Error:', (error as Error).message);
      return this.executeOnHost(code);
    }
  }

  /**
   * Execute in Docker container with resource limits
   */
  private async executeInDocker(code: string): Promise<ExecutionResult> {
    const dockerArgs = [
      'run', '--rm',
      `--memory=${this.config.memory}`,
      `--cpus=${this.config.cpu}`,
      `--network=${this.config.network}`,
      '--read-only',              // Read-only container
      '--no-new-privileges',      // Security hardening
      '-i',                        // Interactive
      this.config.image!,
      'sh', '-c', code
    ];

    const result = await this.execCommand('docker', dockerArgs, this.config.timeout!);
    return { ...result, executionMode: 'docker' };
  }

  /**
   * Fallback execution on host
   */
  private async executeOnHost(code: string): Promise<ExecutionResult> {
    // Use bun to execute the code on host
    const result = await this.execCommand('bun', ['-e', code], this.config.timeout!);
    return { ...result, executionMode: 'host' };
  }
}


// ============================================================================
// PATTERN 4: Governance Engine Permission System
// ============================================================================

export type Permission = 'allow' | 'deny' | 'ask';

export interface GovernanceRule {
  pattern: RegExp;
  permission: Permission;
  autoApproveMs?: number;  // Auto-approve if human input within this time
  description: string;
}

export interface PermissionRequest {
  action: string;
  requestedAt: number;
  reason?: string;
}

/**
 * Governance engine with permission system
 * 
 * Implements allow/ask/deny pattern with auto-approval timeout
 * for headless operation. Based on sovereignty governance schema.
 * 
 * @example
 * ```typescript
 * const governance = new GovernanceEngine([
 *   { pattern: /COMMIT/, permission: 'allow', description: 'Auto-commit is safe' },
 *   { pattern: /DELETE/, permission: 'ask', autoApproveMs: 300000, description: 'Deletions need review' }
 * ]);
 * 
 * const result = await governance.checkPermission('COMMIT "my changes"');
 * if (result.permission === 'allow') {
 *   // Proceed with commit
 * }
 * ```
 */
export class GovernanceEngine {
  private rules: GovernanceRule[] = [];
  private lastHumanInput: number = Date.now();
  private pendingRequests: Map<string, PermissionRequest> = new Map();

  constructor(rules: GovernanceRule[] = []) {
    this.rules = rules;
  }

  /**
   * Add a governance rule
   */
  addRule(rule: GovernanceRule): void {
    this.rules.push(rule);
  }

  /**
   * Update last human input timestamp (call from UI integration)
   */
  updateHumanActivity(): void {
    this.lastHumanInput = Date.now();
  }

  /**
   * Check if an action is permitted
   */
  async checkPermission(action: string): Promise<{
    permission: Permission;
    requiresApproval: boolean;
    autoApproved: boolean;
    reason: string;
  }> {
    // Find matching rule
    const matchedRule = this.rules.find(r => r.pattern.test(action));

    if (!matchedRule) {
      // No matching rule - deny by default
      return {
        permission: 'deny',
        requiresApproval: false,
        autoApproved: false,
        reason: 'No matching governance rule'
      };
    }

    if (matchedRule.permission === 'allow') {
      return {
        permission: 'allow',
        requiresApproval: false,
        autoApproved: true,
        reason: matchedRule.description
      };
    }

    if (matchedRule.permission === 'deny') {
      return {
        permission: 'deny',
        requiresApproval: false,
        autoApproved: false,
        reason: `Explicitly denied: ${matchedRule.description}`
      };
    }

    // 'ask' - need human approval
    if (matchedRule.autoApproveMs) {
      const timeSinceHumanInput = Date.now() - this.lastHumanInput;
      if (timeSinceHumanInput < matchedRule.autoApproveMs) {
        return {
          permission: 'allow',
          requiresApproval: false,
          autoApproved: true,
          reason: `Auto-approved: human active within ${matchedRule.autoApproveMs}ms`
        };
      }
    }

    return {
      permission: 'ask',
      requiresApproval: true,
      autoApproved: false,
      reason: 'Human approval required'
    };
  }

  /**
   * Request approval for an action
   */
  async requestApproval(action: string, reason?: string): Promise<boolean> {
    this.pendingRequests.set(action, {
      action,
      requestedAt: Date.now(),
      reason
    });

    // In a real implementation, this would wait for human response
    // For now, we'll auto-deny after a timeout
    return new Promise((resolve) => {
      setTimeout(() => {
        const resolved = this.pendingRequests.get(action);
        if (resolved) {
          this.pendingRequests.delete(action);
          resolve(false); // Timeout = deny
        }
      }, 60000); // 60 second timeout
    });
  }
}


// ============================================================================
// PATTERN 5: WebSocket Gateway Error Handling
// ============================================================================

export interface WSMessage {
  type: string;
  payload?: unknown;
  timestamp?: number;
  token?: string;
}

export interface WSData {
  token: string;
  agentId: string;
  authenticated: boolean;
  connectedAt: number;
}

export type WebSocketHandler = (
  ws: { send: (data: string) => void; close: () => void },
  message: WSMessage
) => Promise<void> | void;

/**
 * WebSocket gateway with comprehensive error handling
 * 
 * Handles token authentication, message routing, and graceful
 * client management with proper error isolation.
 * 
 * @example
 * ```typescript
 * const gateway = new WebSocketGateway({
 *   tokenValidator: (token) => token === process.env.GATEWAY_TOKEN,
 *   messageHandler: async (ws, msg) => {
 *     if (msg.type === 'PROMPT') {
 *       ws.send(JSON.stringify({ type: 'RESULT', payload: await process(msg.payload) }));
 *     }
 *   }
 * });
 * ```
 */
export class WebSocketGateway {
  private clients: Map<string, { ws: unknown; data: WSData }> = new Map();
  private messageHandler: WebSocketHandler | null = null;
  private tokenValidator: (token: string) => boolean;

  constructor(options: {
    tokenValidator: (token: string) => boolean;
    messageHandler: WebSocketHandler;
  }) {
    this.tokenValidator = options.tokenValidator;
    this.messageHandler = options.messageHandler;
  }

  /**
   * Handle incoming connection with error wrapping
   */
  handleConnection(ws: unknown, request: { url?: string }, data: Partial<WSData>): {
    success: boolean;
    error?: string;
    clientId?: string;
  } {
    try {
      // Extract token from query params
      const url = new URL(request.url ?? '', 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        return { success: false, error: 'MISSING_TOKEN' };
      }

      if (!this.tokenValidator(token)) {
        return { success: false, error: 'INVALID_TOKEN' };
      }

      const clientId = this.generateClientId();
      this.clients.set(clientId, {
        ws,
        data: {
          token,
          agentId: this.generateAgentId(),
          authenticated: true,
          connectedAt: Date.now()
        }
      });

      return { success: true, clientId };
    } catch (error) {
      return {
        success: false,
        error: `CONNECTION_ERROR: ${(error as Error).message}`
      };
    }
  }

  /**
   * Handle incoming message with error isolation
   */
  async handleMessage(
    clientId: string,
    rawMessage: string
  ): Promise<{ success: boolean; error?: string }> {
    const client = this.clients.get(clientId);
    if (!client) {
      return { success: false, error: 'CLIENT_NOT_FOUND' };
    }

    if (!client.data.authenticated) {
      return { success: false, error: 'NOT_AUTHENTICATED' };
    }

    try {
      const message = JSON.parse(rawMessage) as WSMessage;
      
      if (this.messageHandler) {
        await this.messageHandler(
          client.ws as { send: (data: string) => void; close: () => void },
          message
        );
      }

      return { success: true };
    } catch (error) {
      const err = error as Error;
      
      if (err.name === 'SyntaxError') {
        return { success: false, error: 'INVALID_JSON' };
      }
      
      return { success: false, error: `MESSAGE_HANDLER_ERROR: ${err.message}` };
    }
  }

  /**
   * Broadcast to all authenticated clients
   */
  broadcast(type: string, payload: unknown): { sent: number; failed: number } {
    let sent = 0;
    let failed = 0;

    const message = JSON.stringify({ type, payload, timestamp: Date.now() });

    for (const [clientId, client] of this.clients) {
      try {
        if (client.data.authenticated) {
          (client.ws as { send: (data: string) => void }).send(message);
          sent++;
        }
      } catch (error) {
        console.error(`[Gateway] Failed to send to ${clientId}:`, error);
        failed++;
        this.clients.delete(clientId);
      }
    }

    return { sent, failed };
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`[Gateway] Client ${clientId} disconnected`);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  getStats(): { totalClients: number; authenticatedClients: number } {
    let authenticated = 0;
    for (const client of this.clients.values()) {
      if (client.data.authenticated) authenticated++;
    }
    return { totalClients: this.clients.size, authenticatedClients: authenticated };
  }
}


// ============================================================================
// INTEGRATION: Full Error Handling Middleware Stack
// ============================================================================

export interface ErrorHandlingContext {
  filesystem: ReadOnlyFilesystemHandler;
  audit: OODAMetacognitionAudit;
  sandbox: DockerSandboxExecutor;
  governance: GovernanceEngine;
  epoch: number;
}

/**
 * Integrated error handling middleware combining all patterns
 * 
 * Provides a unified pipeline for executing actions with:
 * - Governance permission checks
 * - Filesystem state validation
 * - OODA audit trail
 * - Error isolation
 * 
 * @example
 * ```typescript
 * const middleware = new ErrorHandlingMiddleware({
 *   filesystem: new ReadOnlyFilesystemHandler(),
 *   audit: new OODAMetacognitionAudit(),
 *   sandbox: new DockerSandboxExecutor(),
 *   governance: new GovernanceEngine(),
 *   epoch: 1
 * });
 * 
 * const result = await middleware.executeWithErrorHandling(
 *   'WRITE "test.yaml"',
 *   () => writeFile('test.yaml', 'content')
 * );
 * ```
 */
export class ErrorHandlingMiddleware {
  constructor(private ctx: ErrorHandlingContext) {}

  /**
   * Execute action with full error handling pipeline
   */
  async executeWithErrorHandling<T>(
    action: string,
    fn: () => Promise<T>,
    options: { requireGovernance?: boolean } = {}
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    const { requireGovernance = true } = options;

    // 1. Check governance permissions
    if (requireGovernance) {
      const permission = await this.ctx.governance.checkPermission(action);
      if (permission.permission !== 'allow') {
        return {
          success: false,
          error: `GOVERNANCE_DENIED: ${permission.reason}`
        };
      }
    }

    // 2. Check filesystem state for relevant actions
    if (action.includes('COMMIT') || action.includes('WRITE')) {
      await this.ctx.filesystem.refreshStatus();
      if (this.ctx.filesystem.status.isReadOnly) {
        return {
          success: false,
          error: 'READ_ONLY_FS: Cannot perform write operations'
        };
      }
    }

    // 3. Execute with OODA audit trail
    const auditRecord = this.ctx.audit.createRecord(
      {
        epoch: this.ctx.epoch,
        currentAction: action,
        priorActions: [],
        environmentState: {
          readonly: this.ctx.filesystem.status.isReadOnly,
          gitWritable: this.ctx.filesystem.status.canWriteGit
        }
      },
      action
    );

    try {
      const result = await fn();
      return { success: true, result };
    } catch (error) {
      const err = error as Error;
      console.error(`[ErrorHandling] Action "${action}" failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get comprehensive status report
   */
  getStatus(): {
    epoch: number;
    filesystem: FilesystemStatus;
    audit: ReturnType<OODAMetacognitionAudit['getStats']>;
    sandbox: { dockerAvailable: boolean };
    pendingGovernance: number;
  } {
    return {
      epoch: this.ctx.epoch,
      filesystem: this.ctx.filesystem.status,
      audit: this.ctx.audit.getStats(),
      sandbox: { dockerAvailable: false }, // Would need to check
      pendingGovernance: 0
    };
  }
}


// End of patterns.ts (removed redundant block export)