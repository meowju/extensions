/**
 * Swarm Routes
 * 
 * REST API route definitions for swarm orchestration endpoints.
 * Combines path patterns with controller handlers.
 */

import {
  createSession,
  getSession,
  listSessions,
  approveSession,
  cancelSession,
} from '../controllers/swarm.controller.js';

/**
 * Route definitions for swarm endpoints
 * 
 * Format:
 * {
 *   'path': {
 *     methods: ['GET', 'POST', ...],
 *     handler: async (request, params) => Response,
 *     paramNames: ['param1', 'param2', ...],  // extracted from path
 *     description: 'Route description'
 *   }
 * }
 */

export const swarmRoutes = {
  // POST /swarm - Create a new swarm session
  '/swarm': {
    methods: ['POST'],
    handler: createSession,
    description: 'Create a new swarm session from natural language intent',
  },

  // GET /swarm - List all swarm sessions
  '/swarm': {
    methods: ['GET'],
    handler: listSessions,
    description: 'List all swarm sessions with pagination and filtering',
  },

  // GET /swarm/:sessionId - Get a swarm session by ID
  '/swarm/:sessionId': {
    methods: ['GET'],
    handler: getSession,
    paramNames: ['sessionId'],
    description: 'Get swarm session details by ID',
  },

  // POST /swarm/:sessionId/approve - Approve a session for execution
  '/swarm/:sessionId/approve': {
    methods: ['POST'],
    handler: approveSession,
    paramNames: ['sessionId'],
    description: 'Approve a swarm session and trigger execution',
  },

  // POST /swarm/:sessionId/cancel - Cancel a session
  '/swarm/:sessionId/cancel': {
    methods: ['POST'],
    handler: cancelSession,
    paramNames: ['sessionId'],
    description: 'Cancel a pending or executing session',
  },
};

// ============================================================================
// OPENAPI SCHEMA (for documentation)
// ============================================================================

/**
 * OpenAPI 3.0 path definitions for swarm endpoints
 * Used for automatic API documentation generation
 */
export const swarmOpenApiSpec = {
  '/swarm': {
    post: {
      tags: ['Swarm'],
      summary: 'Create a new swarm session',
      description: 'Submit a natural language intent and receive an execution plan for approval',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CreateSwarmSessionInput',
            },
            example: {
              intent: 'Every night at 2am, pull all unfulfilled Shopify orders from the last 24 hours, check inventory in Google Sheets, and send me a Slack summary.',
              model: {
                provider: 'openai',
                name: 'gpt-4o',
                parameters: {
                  temperature: 0.7,
                  maxTokens: 4096,
                },
              },
              credentials: [
                { id: 'uuid-shopify-key', name: 'shopify_api', provider: 'shopify' },
                { id: 'uuid-slack-key', name: 'slack_bot', provider: 'slack' },
              ],
              skills: [
                { name: 'shopify-order-sync', source: 'platform' },
                { name: 'slack-digest', source: 'platform' },
              ],
              constraints: {
                maxExecutionTime: 300,
                maxWorkers: 5,
                allowWrite: true,
              },
              schedule: {
                enabled: true,
                cron: '0 2 * * *',
                timezone: 'America/New_York',
              },
              priority: 'normal',
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Session created with execution plan',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SwarmSessionResponse',
              },
            },
          },
        },
        '400': {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError',
              },
            },
          },
        },
      },
    },
    get: {
      tags: ['Swarm'],
      summary: 'List swarm sessions',
      description: 'Retrieve a paginated list of swarm sessions with optional filtering',
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', minimum: 1, default: 1 },
          description: 'Page number',
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          description: 'Items per page',
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending', 'parsing', 'awaiting_approval', 'approved', 'executing', 'completed', 'failed', 'cancelled'],
          },
          description: 'Filter by session status',
        },
        {
          name: 'priority',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'urgent'],
          },
          description: 'Filter by priority',
        },
        {
          name: 'search',
          in: 'query',
          schema: { type: 'string', maxLength: 100 },
          description: 'Search in intent text',
        },
        {
          name: 'createdAfter',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
          description: 'Filter sessions created after this timestamp',
        },
        {
          name: 'createdBefore',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
          description: 'Filter sessions created before this timestamp',
        },
      ],
      responses: {
        '200': {
          description: 'List of swarm sessions with pagination',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/SwarmSessionResponse' },
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' },
                      hasNext: { type: 'boolean' },
                      hasPrev: { type: 'boolean' },
                    },
                  },
                  requestId: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/swarm/{sessionId}': {
    get: {
      tags: ['Swarm'],
      summary: 'Get swarm session by ID',
      description: 'Retrieve details of a specific swarm session',
      parameters: [
        {
          name: 'sessionId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Unique session identifier',
        },
      ],
      responses: {
        '200': {
          description: 'Swarm session details',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SwarmSessionResponse',
              },
            },
          },
        },
        '404': {
          description: 'Session not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NotFoundError' },
            },
          },
        },
      },
    },
  },
  '/swarm/{sessionId}/approve': {
    post: {
      tags: ['Swarm'],
      summary: 'Approve swarm session for execution',
      description: 'Approve a session plan and trigger worker dispatch',
      parameters: [
        {
          name: 'sessionId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Unique session identifier',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                approvedSteps: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific steps to approve (all if omitted)',
                },
                approvedCredentials: {
                  type: 'array',
                  items: { type: 'string', format: 'uuid' },
                  description: 'IDs of credentials to approve',
                },
                modifications: {
                  type: 'object',
                  description: 'Requested modifications to the plan',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Session approved and execution started',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SwarmSessionResponse',
              },
            },
          },
        },
        '400': {
          description: 'Invalid state for approval',
        },
      },
    },
  },
  '/swarm/{sessionId}/cancel': {
    post: {
      tags: ['Swarm'],
      summary: 'Cancel swarm session',
      description: 'Cancel a pending or executing session',
      parameters: [
        {
          name: 'sessionId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Unique session identifier',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  maxLength: 500,
                  description: 'Cancellation reason',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Session cancelled successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SwarmSessionResponse',
              },
            },
          },
        },
        '400': {
          description: 'Invalid state for cancellation',
        },
      },
    },
  },
};

/**
 * OpenAPI components schema definitions
 */
export const swarmOpenApiComponents = {
  schemas: {
    CreateSwarmSessionInput: {
      type: 'object',
      required: ['intent', 'model'],
      properties: {
        intent: {
          type: 'string',
          minLength: 10,
          maxLength: 10000,
          description: 'Natural language description of the task',
        },
        model: {
          type: 'object',
          required: ['provider', 'name'],
          properties: {
            provider: {
              type: 'string',
              enum: ['openai', 'anthropic', 'google', 'deepseek', 'custom'],
            },
            name: { type: 'string' },
            apiKeyRef: { type: 'string', format: 'uuid' },
            customEndpoint: { type: 'string', format: 'uri' },
            parameters: {
              type: 'object',
              properties: {
                temperature: { type: 'number', minimum: 0, maximum: 2 },
                maxTokens: { type: 'integer', minimum: 1 },
                topP: { type: 'number', minimum: 0, maximum: 1 },
              },
            },
          },
        },
        credentials: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string', maxLength: 50 },
              provider: { type: 'string', maxLength: 50 },
            },
          },
          maxItems: 20,
        },
        skills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string', maxLength: 100 },
              source: { type: 'string', enum: ['platform', 'github', 'upload'] },
              sourceUrl: { type: 'string', format: 'uri' },
              version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
            },
          },
          maxItems: 50,
        },
        constraints: {
          type: 'object',
          properties: {
            maxExecutionTime: { type: 'integer', minimum: 1, maximum: 3600 },
            maxWorkers: { type: 'integer', minimum: 1, maximum: 50 },
            timeoutPerWorker: { type: 'integer', minimum: 1, maximum: 300 },
            allowWrite: { type: 'boolean' },
            budgetLimit: { type: 'number', minimum: 0 },
          },
        },
        schedule: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            cron: { type: 'string' },
            interval: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'] },
            timezone: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        continuous: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            maxExecutions: { type: 'integer', minimum: 1, maximum: 1000 },
            stopOnError: { type: 'boolean' },
            notifyOnFailure: { type: 'boolean' },
          },
        },
        webhook: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            events: {
              type: 'array',
              items: { type: 'string', enum: ['start', 'progress', 'complete', 'error'] },
            },
            secret: { type: 'string', minLength: 16, maxLength: 256 },
            retryCount: { type: 'integer', minimum: 0, maximum: 5 },
            timeout: { type: 'integer', minimum: 1, maximum: 30 },
          },
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'urgent'],
          default: 'normal',
        },
        metadata: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
    SwarmSessionResponse: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: {
          type: 'string',
          enum: ['pending', 'parsing', 'awaiting_approval', 'approved', 'executing', 'completed', 'failed', 'cancelled'],
        },
        intent: { type: 'string' },
        model: {
          type: 'object',
          properties: {
            provider: { type: 'string' },
            name: { type: 'string' },
          },
        },
        manifest: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  stepId: { type: 'string' },
                  workerId: { type: 'string' },
                  skill: { type: 'string' },
                  description: { type: 'string' },
                  operation: { type: 'string', enum: ['read', 'write', 'transform'] },
                  credentials: { type: 'array', items: { type: 'string' } },
                  estimatedDuration: { type: 'integer' },
                  status: { type: 'string' },
                  dependsOn: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            totalEstimatedDuration: { type: 'integer' },
            estimatedCost: { type: 'number' },
            warnings: { type: 'array', items: { type: 'string' } },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        approvedAt: { type: 'string', format: 'date-time' },
        completedAt: { type: 'string', format: 'date-time' },
        result: { type: 'object', additionalProperties: true },
        error: { type: 'string' },
      },
    },
    ValidationError: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string' },
            details: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            requestId: { type: 'string' },
          },
        },
      },
    },
    NotFoundError: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'NOT_FOUND' },
            message: { type: 'string' },
            requestId: { type: 'string' },
          },
        },
      },
    },
  },
};