/**
 * Mock Database Client for Meow Harness
 * Implements the minimal interface required by onboarding and workers.
 */

export class DBClient {
  private platformUsers: Map<string, any> = new Map();
  private auditLogs: any[] = [];
  private taskResults: Map<string, any> = new Map();
  private transactions: Map<string, any> = new Map();
  private completedTasks: Set<string> = new Set();

  constructor(public connectionString?: string) {}

  setPlatformUser(userId: string, supabaseUrl: string, encryptedServiceRole: string) {
    this.platformUsers.set(userId, { userId, supabaseUrl, encryptedServiceRole });
  }

  getPlatformUser(userId: string) {
    return this.platformUsers.get(userId);
  }

  checkIdempotency(taskId: string): boolean {
    return this.completedTasks.has(taskId);
  }

  writeAuditLog(sessionId: string, event: string, metadata: any) {
    this.auditLogs.push({ sessionId, event, metadata, timestamp: Date.now() });
  }

  simulateReadSecret(secretId: string) {
    // Mock secret reading
    return `mock-secret-for-${secretId}`;
  }

  logTransaction(taskId: string, status: string, output: any) {
    this.transactions.set(taskId, { status, output, timestamp: Date.now() });
    if (status === 'completed') {
      this.completedTasks.add(taskId);
    }
  }

  logTaskResult(sessionId: string, taskId: string, skill: string, status: string, output: any, isError: boolean) {
    this.taskResults.set(`${sessionId}:${taskId}`, { skill, status, output, isError, timestamp: Date.now() });
  }

  updateSessionStatus(sessionId: string, status: string) {
    // Mock update
  }

  createSession(data: any) {
    return { id: `session-${Date.now()}`, ...data };
  }
}

let instance: DBClient | null = null;

export function getDbClient(): DBClient {
  if (!instance) {
    instance = new DBClient();
  }
  return instance;
}
