/**
 * Swarm Session Schema
 * 
 * Input validation schemas for swarm execution endpoints.
 * Implements Zod for runtime type validation with comprehensive error messages.
 */

import { z } from 'zod';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Supported AI model providers
 */
export const ModelProviderSchema = z.enum([
  'openai',
  'anthropic', 
  'google',
  'deepseek',
  'custom'
]);

export type ModelProvider = z.infer<typeof ModelProviderSchema>;

/**
 * Session status states
 */
export const SessionStatusSchema = z.enum([
  'pending',
  'parsing',
  'awaiting_approval',
  'approved',
  'executing',
  'completed',
  'failed',
  'cancelled'
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * Execution priority levels
 */
export const PrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export type Priority = z.infer<typeof PrioritySchema>;

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Credentials reference schema
 * References credentials stored in user's Supabase Vault
 */
export const credentialRefSchema = z.object({
  id: z.string().uuid({ message: 'Credential ID must be a valid UUID' }),
  name: z.string().min(1).max(50).describe('Human-readable credential name'),
  provider: z.string().min(1).max(50).describe('Provider (e.g., openai, shopify)'),
});

/**
 * Skill reference schema
 * References skills from the skill marketplace or user's custom skills
 */
export const skillRefSchema = z.object({
  id: z.string().min(1).optional().describe('Skill ID (platform assigned)'),
  name: z.string().min(1).max(100).describe('Skill name'),
  source: z.enum(['platform', 'github', 'upload']).default('platform'),
  sourceUrl: z.string().url().optional().describe('GitHub or upload URL'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver format').optional(),
});

/**
 * Schedule configuration schema
 */
export const scheduleConfigSchema = z.object({
  enabled: z.boolean().default(false),
  cron: z.string().regex(
    /^[0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+$/,
    'Cron must be standard 5-field format: minute hour day month weekday'
  ).optional(),
  interval: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
  timezone: z.string().default('UTC'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    // If enabled, must have either cron or interval
    if (data.enabled && !data.cron && !data.interval) {
      return false;
    }
    return true;
  },
  { message: 'Schedule must specify cron expression or interval when enabled' }
);

/**
 * Continuous mode configuration
 */
export const continuousModeSchema = z.object({
  enabled: z.boolean().default(false),
  maxExecutions: z.number().int().positive().max(1000).optional(),
  stopOnError: z.boolean().default(true),
  notifyOnFailure: z.boolean().default(true),
});

/**
 * Webhook configuration for callbacks
 */
export const webhookConfigSchema = z.object({
  url: z.string().url({ message: 'Webhook URL must be a valid URL' }),
  events: z.array(z.enum(['start', 'progress', 'complete', 'error'])).min(1),
  secret: z.string().min(16).max(256).optional().describe('HMAC secret for signature verification'),
  retryCount: z.number().int().min(0).max(5).default(3),
  timeout: z.number().int().positive().max(30).default(10).describe('Timeout in seconds'),
});

/**
 * Create Swarm Session Request Schema
 * 
 * Validates incoming intent submission requests
 */
export const createSwarmSessionSchema = z.object({
  // Core intent
  intent: z.string()
    .min(10, 'Intent must be at least 10 characters')
    .max(10000, 'Intent must be at most 10,000 characters')
    .describe('Natural language description of the task'),

  // Model configuration
  model: z.object({
    provider: ModelProviderSchema,
    name: z.string().min(1).max(100).describe('Model name (e.g., gpt-4o, claude-3-5-sonnet)'),
    apiKeyRef: z.string().uuid({ message: 'API key reference must be a valid UUID' }).optional(),
    customEndpoint: z.string().url().optional(),
    parameters: z.object({
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().int().positive().max(100000).default(4096),
      topP: z.number().min(0).max(1).optional(),
    }).optional(),
  }),

  // Optional credentials for the task
  credentials: z.array(credentialRefSchema).max(20).optional()
    .describe('References to credentials needed for this task'),

  // Skills to use
  skills: z.array(skillRefSchema).max(50).optional()
    .describe('Skills to load for this execution'),

  // Constraints and limitations
  constraints: z.object({
    maxExecutionTime: z.number().int().positive().max(3600).default(300)
      .describe('Maximum execution time in seconds'),
    maxWorkers: z.number().int().positive().max(50).default(10)
      .describe('Maximum parallel workers'),
    timeoutPerWorker: z.number().int().positive().max(300).default(60)
      .describe('Timeout per worker in seconds'),
    allowWrite: z.boolean().default(true)
      .describe('Allow write operations (Plan-Diff-Approve gate)'),
    budgetLimit: z.number().positive().optional()
      .describe('Maximum gas credits to spend'),
  }).optional(),

  // Scheduling
  schedule: scheduleConfigSchema.optional(),

  // Continuous mode
  continuous: continuousModeSchema.optional(),

  // Webhooks
  webhook: webhookConfigSchema.optional(),

  // Priority
  priority: PrioritySchema.default('normal'),

  // Metadata
  metadata: z.record(z.string(), z.unknown()).optional()
    .describe('Custom key-value metadata'),
});

/**
 * Get Swarm Session Request Schema (path params)
 */
export const getSwarmSessionSchema = z.object({
  sessionId: z.string().uuid({ message: 'Session ID must be a valid UUID' }),
});

/**
 * List Swarm Sessions Query Schema
 */
export const listSwarmSessionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: SessionStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
});

/**
 * Approve Swarm Session Request Schema
 */
export const approveSwarmSessionSchema = z.object({
  sessionId: z.string().uuid({ message: 'Session ID must be a valid UUID' }),
  approvedSteps: z.array(z.string()).optional()
    .describe('Specific steps to approve (omit to approve all)'),
  approvedCredentials: z.array(z.string().uuid()).optional()
    .describe('IDs of credentials to approve for use'),
  modifications: z.record(z.string(), z.unknown()).optional()
    .describe('Requested modifications to the plan'),
});

/**
 * Cancel Swarm Session Request Schema
 */
export const cancelSwarmSessionSchema = z.object({
  sessionId: z.string().uuid({ message: 'Session ID must be a valid UUID' }),
  reason: z.string().max(500).optional(),
});

// ============================================================================
// OUTPUT SCHEMAS (Responses)
// ============================================================================

/**
 * DAG Step schema for plan display
 */
export const dagStepSchema = z.object({
  stepId: z.string(),
  workerId: z.string().optional(),
  skill: z.string(),
  description: z.string(),
  operation: z.enum(['read', 'write', 'transform']),
  credentials: z.array(z.string()),
  estimatedDuration: z.number().int().positive(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']).default('pending'),
  dependsOn: z.array(z.string()).default([]),
});

/**
 * Swarm Manifest schema (execution plan)
 */
export const swarmManifestSchema = z.object({
  version: z.string(),
  steps: z.array(dagStepSchema),
  totalEstimatedDuration: z.number().int().positive(),
  estimatedCost: z.number().positive().optional(),
  warnings: z.array(z.string()).optional(),
});

/**
 * Swarm Session Response Schema
 */
export const swarmSessionResponseSchema = z.object({
  id: z.string().uuid(),
  status: SessionStatusSchema,
  intent: z.string(),
  model: z.object({
    provider: ModelProviderSchema,
    name: z.string(),
  }),
  manifest: swarmManifestSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  approvedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

/**
 * Paginated Response Schema
 */
export const paginatedSwarmSessionsSchema = z.object({
  sessions: z.array(swarmSessionResponseSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().positive(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateSwarmSessionInput = z.infer<typeof createSwarmSessionSchema>;
export type GetSwarmSessionInput = z.infer<typeof getSwarmSessionSchema>;
export type ListSwarmSessionsInput = z.infer<typeof listSwarmSessionsSchema>;
export type ApproveSwarmSessionInput = z.infer<typeof approveSwarmSessionSchema>;
export type CancelSwarmSessionInput = z.infer<typeof cancelSwarmSessionSchema>;

export type CredentialRef = z.infer<typeof credentialRefSchema>;
export type SkillRef = z.infer<typeof skillRefSchema>;
export type ScheduleConfig = z.infer<typeof scheduleConfigSchema>;
export type ContinuousMode = z.infer<typeof continuousModeSchema>;
export type WebhookConfig = z.infer<typeof webhookConfigSchema>;

export type DAGStep = z.infer<typeof dagStepSchema>;
export type SwarmManifest = z.infer<typeof swarmManifestSchema>;
export type SwarmSessionResponse = z.infer<typeof swarmSessionResponseSchema>;
export type PaginatedSwarmSessions = z.infer<typeof paginatedSwarmSessionsSchema>;