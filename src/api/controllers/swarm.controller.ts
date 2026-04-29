/**
 * Swarm Controller
 * 
 * REST API endpoint implementation for swarm orchestration.
 * Handles intent parsing, session management, and execution control.
 * 
 * Features:
 * - Zod schema validation for all request data
 * - Standardized success/error response format
 * - Request ID tracking for debugging
 * - Comprehensive error handling
 * - Pagination support
 */

import { v4 as uuidv4 } from 'uuid';
import {
  createSwarmSessionSchema,
  getSwarmSessionSchema,
  listSwarmSessionsSchema,
  approveSwarmSessionSchema,
  cancelSwarmSessionSchema,
  CreateSwarmSessionInput,
  DAGStep,
  SwarmManifest,
  SwarmSessionResponse,
  SessionStatus,
  ModelProvider,
  Priority,
} from '../schemas/swarm.schema.js';
import {
  success,
  error,
  paginated,
  calculatePagination,
  ContentType,
  ErrorCode,
  StatusCode,
} from '../utils/response.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Standard success response wrapper
 */
interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

/**
 * Standard error response structure
 */
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    requestId: string;
  };
}

/**
 * Swarm Session entity
 */
interface SwarmSession {
  id: string;
  userId: string;
  status: SessionStatus;
  intent: string;
  model: {
    provider: ModelProvider;
    name: string;
    customEndpoint?: string;
    parameters?: Record<string, unknown>;
  };
  manifest?: SwarmManifest;
  credentials: string[];
  skills: string[];
  schedule?: {
    enabled: boolean;
    cron?: string;
    interval?: string;
    timezone: string;
  };
  continuous?: {
    enabled: boolean;
    maxExecutions?: number;
    stopOnError: boolean;
    notifyOnFailure: boolean;
  };
  webhook?: {
    url: string;
    events: string[];
    retryCount: number;
    timeout: number;
  };
  priority: Priority;
  result?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  completedAt?: string;
}

// ============================================================================
// IN-MEMORY STORAGE (for demo - production would use Supabase)
// ============================================================================

const sessions: Map<string, SwarmSession> = new Map();

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Parse and validate request body against a Zod schema
 */
function parseBody<T>(
  body: unknown,
  schema: typeof createSwarmSessionSchema | typeof approveSwarmSessionSchema | typeof cancelSwarmSessionSchema
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(body);

  if (!result.success) {
    const details: Record<string, string[]> = {};
    const errorList = result.error.issues ?? result.error.errors ?? [];
    for (const err of errorList) {
      const path = err.path?.join('.') ?? 'body';
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(err.message);
    }

    return {
      success: false,
      response: Response.json(
        {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid request body',
            details,
          },
        } as ApiError,
        {
          status: StatusCode.BAD_REQUEST,
          headers: { 'Content-Type': ContentType.JSON },
        }
      ),
    };
  }

  return { success: true, data: result.data as T };
}

/**
 * Parse and validate query parameters
 */
function parseQuery(
  query: URLSearchParams
): { success: true; data: { page: number; limit: number; status?: string; priority?: string; search?: string; createdAfter?: string; createdBefore?: string } } | { success: false; response: Response } {
  const queryObj: Record<string, string> = {};
  query.forEach((value, key) => {
    queryObj[key] = value;
  });

  const result = listSwarmSessionsSchema.safeParse(queryObj);

  if (!result.success) {
    const details: Record<string, string[]> = {};
    const errorList = result.error.issues ?? result.error.errors ?? [];
    for (const err of errorList) {
      const path = err.path?.join('.') ?? 'query';
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(err.message);
    }

    return {
      success: false,
      response: Response.json(
        {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid query parameters',
            details,
          },
        } as ApiError,
        {
          status: StatusCode.BAD_REQUEST,
          headers: { 'Content-Type': ContentType.JSON },
        }
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate URL path parameters
 */
function parseParams(
  params: Record<string, string>
): { success: true; data: { sessionId: string } } | { success: false; response: Response } {
  const result = getSwarmSessionSchema.safeParse(params);

  if (!result.success) {
    const details: Record<string, string[]> = {};
    const errorList = result.error.issues ?? result.error.errors ?? [];
    for (const err of errorList) {
      const path = err.path?.join('.') ?? 'params';
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(err.message);
    }

    return {
      success: false,
      response: Response.json(
        {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid path parameters',
            details,
          },
        } as ApiError,
        {
          status: StatusCode.BAD_REQUEST,
          headers: { 'Content-Type': ContentType.JSON },
        }
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Helper to attach request ID to error responses
 */
function attachRequestId(response: Response, requestId: string): Response {
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

// ============================================================================
// LLMS INTENT PARSING (Mock implementation - production would call actual LLM)
// ============================================================================

/**
 * Parse natural language intent into a swarm manifest
 * 
 * In production, this would call the user's configured LLM with:
 * - The intent text
 * - Available skills
 * - Credential references
 * - Constraints
 */
async function parseIntentToManifest(
  intent: string,
  model: { provider: ModelProvider; name: string; parameters?: Record<string, unknown> },
  credentials: string[],
  skills: string[],
  constraints?: {
    maxExecutionTime?: number;
    maxWorkers?: number;
    allowWrite?: boolean;
  }
): Promise<SwarmManifest> {
  // Mock manifest generation - in production this calls the LLM
  const steps: DAGStep[] = [];

  // Simple heuristic: extract keywords to create mock steps
  const keywords = intent.toLowerCase().split(/\s+/);
  
  if (keywords.some(k => ['shopify', 'order', 'orders'].includes(k))) {
    steps.push({
      stepId: uuidv4(),
      skill: 'shopify-order-sync',
      description: 'Fetch orders from Shopify',
      operation: 'read',
      credentials: credentials.slice(0, 1),
      estimatedDuration: 30,
      dependsOn: [],
    });
  }

  if (keywords.some(k => ['sheets', 'google', 'spreadsheet'].includes(k))) {
    steps.push({
      stepId: uuidv4(),
      skill: 'google-sheets',
      description: 'Read/write Google Sheets data',
      operation: 'read',
      credentials: credentials.slice(1, 2),
      estimatedDuration: 20,
      dependsOn: [],
    });
  }

  if (keywords.some(k => ['slack', 'message', 'notify'].includes(k))) {
    const slackStep: DAGStep = {
      stepId: uuidv4(),
      skill: 'slack-digest',
      description: 'Post notification to Slack',
      operation: 'write',
      credentials: credentials.slice(2, 3),
      estimatedDuration: 15,
      dependsOn: [],
    };
    
    // If we have Shopify orders, Slack depends on them
    if (steps.some(s => s.skill === 'shopify-order-sync')) {
      const shopifyStep = steps.find(s => s.skill === 'shopify-order-sync')!;
      slackStep.dependsOn.push(shopifyStep.stepId);
    }
    
    steps.push(slackStep);
  }

  // If no specific keywords matched, create a generic step
  if (steps.length === 0) {
    steps.push({
      stepId: uuidv4(),
      skill: skills[0] || 'generic-task',
      description: `Execute: ${intent.substring(0, 100)}...`,
      operation: constraints?.allowWrite !== false ? 'write' : 'read',
      credentials: credentials,
      estimatedDuration: 60,
      dependsOn: [],
    });
  }

  return {
    version: '1.0',
    steps,
    totalEstimatedDuration: steps.reduce((sum, s) => sum + s.estimatedDuration, 0),
    estimatedCost: steps.length * 0.01,
    warnings: constraints?.allowWrite !== false ? ['This plan includes write operations'] : [],
  };
}

// ============================================================================
// HTTP METHODS
// ============================================================================

/**
 * POST /swarm - Create a new swarm session
 * 
 * Creates a new swarm execution from natural language intent.
 * Parses intent into a manifest and returns the execution plan for approval.
 * 
 * Request Body:
 * - intent: Natural language description (required)
 * - model: AI model configuration (required)
 * - credentials: Credential references (optional)
 * - skills: Skill references (optional)
 * - constraints: Execution constraints (optional)
 * - schedule: Scheduling configuration (optional)
 * - continuous: Continuous mode configuration (optional)
 * - webhook: Webhook configuration (optional)
 * - priority: Execution priority (optional, default: normal)
 * 
 * Returns:
 * - 201: Session created with manifest for approval
 * - 400: Validation error
 */
export async function createSession(request: Request): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') ?? `req_${Date.now().toString(36)}`;

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid JSON in request body',
          requestId,
        },
      } as ApiError,
      {
        status: StatusCode.BAD_REQUEST,
        headers: { 'Content-Type': ContentType.JSON },
      }
    );
  }

  // Validate body
  const bodyResult = parseBody<CreateSwarmSessionInput>(body, createSwarmSessionSchema);
  if (!bodyResult.success) {
    const errorResponse = bodyResult.response as Response;
    return errorResponse;
  }

  const input = bodyResult.data;

  // Generate manifest from intent (would call LLM in production)
  const manifest = await parseIntentToManifest(
    input.intent,
    input.model,
    input.credentials?.map(c => c.id) ?? [],
    input.skills?.map(s => s.name) ?? [],
    input.constraints
  );

  // Create session
  const now = new Date().toISOString();
  const session: SwarmSession = {
    id: uuidv4(),
    userId: 'user_123', // Would come from auth context in production
    status: 'awaiting_approval',
    intent: input.intent,
    model: {
      provider: input.model.provider,
      name: input.model.name,
      customEndpoint: input.model.customEndpoint,
      parameters: input.model.parameters,
    },
    manifest,
    credentials: input.credentials?.map(c => c.id) ?? [],
    skills: input.skills?.map(s => s.name) ?? [],
    constraints: input.constraints,
    schedule: input.schedule,
    continuous: input.continuous,
    webhook: input.webhook,
    priority: input.priority,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };

  sessions.set(session.id, session);

  // Build response
  const response: ApiSuccess<SwarmSessionResponse> = {
    success: true,
    data: {
      id: session.id,
      status: session.status,
      intent: session.intent,
      model: { provider: session.model.provider, name: session.model.name },
      manifest: session.manifest,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
    requestId,
  };

  return Response.json(response, {
    status: StatusCode.CREATED,
    headers: {
      'Content-Type': ContentType.JSON,
      'X-Request-ID': requestId,
      Location: `/swarm/${session.id}`,
    },
  });
}

/**
 * GET /swarm/:sessionId - Get a swarm session by ID
 * 
 * Returns the current state of a swarm session including
 * manifest, execution progress, and results.
 * 
 * Path Parameters:
 * - sessionId: Session UUID
 * 
 * Returns:
 * - 200: Session details
 * - 400: Invalid ID format
 * - 404: Session not found
 */
export async function getSession(request: Request, params: Record<string, string>): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') ?? `req_${Date.now().toString(36)}`;

  // Parse and validate path parameters
  const paramsResult = parseParams(params);
  if (!paramsResult.success) {
    return paramsResult.response;
  }

  const { sessionId } = paramsResult.data;

  // Find session
  const session = sessions.get(sessionId);

  if (!session) {
    return Response.json(
      {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `Session with ID '${sessionId}' not found`,
          requestId,
        },
      } as ApiError,
      {
        status: StatusCode.NOT_FOUND,
        headers: { 'Content-Type': ContentType.JSON },
      }
    );
  }

  const response: ApiSuccess<SwarmSessionResponse> = {
    success: true,
    data: {
      id: session.id,
      status: session.status,
      intent: session.intent,
      model: { provider: session.model.provider, name: session.model.name },
      manifest: session.manifest,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      approvedAt: session.approvedAt,
      completedAt: session.completedAt,
      result: session.result,
      error: session.error,
    },
    requestId,
  };

  return Response.json(response, {
    status: StatusCode.OK,
    headers: {
      'Content-Type': ContentType.JSON,
      'X-Request-ID': requestId,
    },
  });
}

/**
 * GET /swarm - List all swarm sessions
 * 
 * Returns paginated list of swarm sessions with optional filtering.
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - status: Filter by session status (optional)
 * - priority: Filter by priority (optional)
 * - search: Search in intent text (optional)
 * - createdAfter: Filter by creation date (optional)
 * - createdBefore: Filter by creation date (optional)
 * 
 * Returns:
 * - 200: List of sessions with pagination metadata
 * - 400: Invalid query parameters
 */
export async function listSessions(request: Request): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') ?? `req_${Date.now().toString(36)}`;

  // Parse and validate query parameters
  const queryResult = parseQuery(new URL(request.url).searchParams);
  if (!queryResult.success) {
    return queryResult.response;
  }

  const { page, limit, status, priority, search, createdAfter, createdBefore } = queryResult.data;

  // Get all sessions and apply filters
  let filteredSessions = Array.from(sessions.values());

  // Apply filters
  if (status) {
    filteredSessions = filteredSessions.filter(s => s.status === status);
  }
  if (priority) {
    filteredSessions = filteredSessions.filter(s => s.priority === priority);
  }
  if (search) {
    const searchLower = search.toLowerCase();
    filteredSessions = filteredSessions.filter(s => s.intent.toLowerCase().includes(searchLower));
  }
  if (createdAfter) {
    const afterDate = new Date(createdAfter);
    filteredSessions = filteredSessions.filter(s => new Date(s.createdAt) >= afterDate);
  }
  if (createdBefore) {
    const beforeDate = new Date(createdBefore);
    filteredSessions = filteredSessions.filter(s => new Date(s.createdAt) <= beforeDate);
  }

  // Sort by creation date (newest first)
  filteredSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Apply pagination
  const total = filteredSessions.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedSessions = filteredSessions.slice(startIndex, startIndex + limit);

  // Map to response format
  const sessionResponses: SwarmSessionResponse[] = paginatedSessions.map(s => ({
    id: s.id,
    status: s.status,
    intent: s.intent,
    model: { provider: s.model.provider, name: s.model.name },
    manifest: s.manifest,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    approvedAt: s.approvedAt,
    completedAt: s.completedAt,
    result: s.result,
    error: s.error,
  }));

  const response: ApiSuccess<SwarmSessionResponse[]> = {
    success: true,
    data: sessionResponses,
    meta: calculatePagination(total, page, limit),
    requestId,
  };

  return Response.json(response, {
    status: StatusCode.OK,
    headers: {
      'Content-Type': ContentType.JSON,
      'X-Request-ID': requestId,
    },
  });
}

/**
 * POST /swarm/:sessionId/approve - Approve a swarm session for execution
 * 
 * Called after user reviews the plan-diff. Approves the session
 * and triggers worker dispatch.
 * 
 * Path Parameters:
 * - sessionId: Session UUID
 * 
 * Request Body:
 * - approvedSteps: Specific steps to approve (optional, all if omitted)
 * - approvedCredentials: IDs of credentials to approve (optional)
 * - modifications: Requested plan modifications (optional)
 * 
 * Returns:
 * - 200: Session approved and execution started
 * - 400: Validation error or session not in approvable state
 * - 404: Session not found
 */
export async function approveSession(request: Request, params: Record<string, string>): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') ?? `req_${Date.now().toString(36)}`;

  // Parse and validate path parameters
  const paramsResult = parseParams(params);
  if (!paramsResult.success) {
    return paramsResult.response;
  }

  const { sessionId } = paramsResult.data;

  // Find session
  const session = sessions.get(sessionId);

  if (!session) {
    return Response.json(
      {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `Session with ID '${sessionId}' not found`,
          requestId,
        },
      } as ApiError,
      {
        status: StatusCode.NOT_FOUND,
        headers: { 'Content-Type': ContentType.JSON },
      }
    );
  }

  // Check session is in correct state
  if (session.status !== 'awaiting_approval') {
    return Response.json(
      {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: `Cannot approve session in '${session.status}' state. Only 'awaiting_approval' sessions can be approved.`,
          requestId,
        },
      } as ApiError,
      {
        status: StatusCode.BAD_REQUEST,
        headers: { 'Content-Type': ContentType.JSON },
      }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid JSON in request body',
          requestId,
        },
      } as ApiError,
      {
        status: StatusCode.BAD_REQUEST,
        headers: { 'Content-Type': ContentType.JSON },
      }
    );
  }

  // Validate body
  const bodyResult = parseBody<{ sessionId: string; approvedSteps?: string[]; approvedCredentials?: string[]; modifications?: Record<string, unknown> }>(
    body,
    approveSwarmSessionSchema
  );
  if (!bodyResult.success) {
    return bodyResult.response;
  }

  // Update session status
  const now = new Date().toISOString();
  session.status = 'approved';
  session.approvedAt = now;
  session.updatedAt = now;

  // In production, this would trigger the dispatcher to start executing workers
  // For now, we'll simulate execution completion after a brief delay

  // Simulate async execution
  setTimeout(() => {
    if (sessions.has(sessionId)) {
      const s = sessions.get(sessionId)!;
      if (s.status === 'approved') {
        s.status = 'executing';
        s.updatedAt = new Date().toISOString();

        // Simulate completion after a bit
        setTimeout(() => {
          if (sessions.has(sessionId)) {
            const ss = sessions.get(sessionId)!;
            ss.status = 'completed';
            ss.completedAt = new Date().toISOString();
            ss.updatedAt = new Date().toISOString();
            ss.result = {
              stepsCompleted: ss.manifest?.steps.length ?? 0,
              totalDuration: ss.manifest?.totalEstimatedDuration ?? 0,
            };
          }
        }, 2000);
      }
    }
  }, 500);

  const response: ApiSuccess<SwarmSessionResponse> = {
    success: true,
    data: {
      id: session.id,
      status: session.status,
      intent: session.intent,
      model: { provider: session.model.provider, name: session.model.name },
      manifest: session.manifest,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      approvedAt: session.approvedAt,
    },
    requestId,
  };

  return Response.json(response, {
    status: StatusCode.OK,
    headers: {
      'Content-Type': ContentType.JSON,
      'X-Request-ID': requestId,
    },
  });
}

/**
 * POST /swarm/:sessionId/cancel - Cancel a swarm session
 * 
 * Cancels a pending or executing session.
 * 
 * Path Parameters:
 * - sessionId: Session UUID
 * 
 * Request Body:
 * - reason: Cancellation reason (optional)
 * 
 * Returns:
 * - 200: Session cancelled
 * - 400: Validation error or session cannot be cancelled
 * - 404: Session not found
 */
export async function cancelSession(request: Request, params: Record<string, string>): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') ?? `req_${Date.now().toString(36)}`;

  // Parse and validate path parameters
  const paramsResult = parseParams(params);
  if (!paramsResult.success) {
    return paramsResult.response;
  }

  const { sessionId } = paramsResult.data;

  // Find session
  const session = sessions.get(sessionId);

  if (!session) {
    return Response.json(
      {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `Session with ID '${sessionId}' not found`,
          requestId,
        },
      } as ApiError,
      {
        status: StatusCode.NOT_FOUND,
        headers: { 'Content-Type': ContentType.JSON },
      }
    );
  }

  // Check session can be cancelled
  const cancellableStates = ['pending', 'parsing', 'awaiting_approval', 'approved', 'executing'];
  if (!cancellableStates.includes(session.status)) {
    return Response.json(
      {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: `Cannot cancel session in '${session.status}' state. Only sessions in [${cancellableStates.join(', ')}] states can be cancelled.`,
          requestId,
        },
      } as ApiError,
      {
        status: StatusCode.BAD_REQUEST,
        headers: { 'Content-Type': ContentType.JSON },
      }
    );
  }

  // Parse request body for reason
  let reason = 'User requested cancellation';
  try {
    const body = await request.json();
    if (body.reason && typeof body.reason === 'string') {
      reason = body.reason;
    }
  } catch {
    // Body is optional, use default reason
  }

  // Update session status
  session.status = 'cancelled';
  session.updatedAt = new Date().toISOString();
  session.error = reason;

  const response: ApiSuccess<SwarmSessionResponse> = {
    success: true,
    data: {
      id: session.id,
      status: session.status,
      intent: session.intent,
      model: { provider: session.model.provider, name: session.model.name },
      manifest: session.manifest,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      error: session.error,
    },
    requestId,
  };

  return Response.json(response, {
    status: StatusCode.OK,
    headers: {
      'Content-Type': ContentType.JSON,
      'X-Request-ID': requestId,
    },
  });
}

// ============================================================================
// UTILITIES (for testing)
// ============================================================================

/**
 * Clear all sessions (for testing)
 */
export function clearSessions(): void {
  sessions.clear();
}

/**
 * Get session count (for testing)
 */
export function getSessionCount(): number {
  return sessions.size;
}

/**
 * Get all sessions (for testing)
 */
export function getAllSessions(): SwarmSession[] {
  return Array.from(sessions.values());
}

/**
 * Get session by ID (for testing)
 */
export function getSessionById(id: string): SwarmSession | undefined {
  return sessions.get(id);
}