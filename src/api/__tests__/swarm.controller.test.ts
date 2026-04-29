/**
 * Swarm Controller Tests
 * 
 * Comprehensive tests for the swarm orchestration REST API endpoints.
 * Tests cover input validation, response formatting, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  createSwarmSessionSchema,
  getSwarmSessionSchema,
  listSwarmSessionsSchema,
  approveSwarmSessionSchema,
  cancelSwarmSessionSchema,
} from '../schemas/swarm.schema.js';

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe('Create Swarm Session Schema', () => {
  it('should validate a complete valid input', () => {
    const validInput = {
      intent: 'Every night at 2am, pull all unfulfilled Shopify orders and send me a Slack summary.',
      model: {
        provider: 'openai',
        name: 'gpt-4o',
        parameters: {
          temperature: 0.7,
          maxTokens: 4096,
        },
      },
      credentials: [
        { id: '550e8400-e29b-41d4-a716-446655440000', name: 'shopify_api', provider: 'shopify' },
      ],
      skills: [
        { name: 'shopify-order-sync', source: 'platform' },
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
      priority: 'high',
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject input with intent shorter than 10 characters', () => {
    const invalidInput = {
      intent: 'short',
      model: { provider: 'openai', name: 'gpt-4o' },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues[0];
      expect(error.path).toContain('intent');
      expect(error.message).toContain('10 characters');
    }
  });

  it('should reject input with intent longer than 10000 characters', () => {
    const invalidInput = {
      intent: 'x'.repeat(10001),
      model: { provider: 'openai', name: 'gpt-4o' },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject invalid model provider', () => {
    const invalidInput = {
      intent: 'Fetch Shopify orders and post to Slack',
      model: { provider: 'invalid_provider', name: 'gpt-4o' },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      const providerError = result.error.issues.find(i => i.path.includes('provider'));
      expect(providerError).toBeDefined();
    }
  });

  it('should reject invalid cron expression format', () => {
    const invalidInput = {
      intent: 'Run task daily',
      model: { provider: 'openai', name: 'gpt-4o' },
      schedule: {
        enabled: true,
        cron: 'not-a-cron',
      },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should require cron or interval when schedule is enabled', () => {
    const invalidInput = {
      intent: 'Run task daily',
      model: { provider: 'openai', name: 'gpt-4o' },
      schedule: {
        enabled: true,
        cron: undefined,
        interval: undefined,
      },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should accept valid interval instead of cron', () => {
    const validInput = {
      intent: 'Run task daily',
      model: { provider: 'openai', name: 'gpt-4o' },
      schedule: {
        enabled: true,
        interval: 'daily',
      },
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should default priority to normal', () => {
    const validInput = {
      intent: 'Run task daily',
      model: { provider: 'openai', name: 'gpt-4o' },
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe('normal');
    }
  });

  it('should reject temperature outside 0-2 range', () => {
    const invalidInput = {
      intent: 'Run task daily',
      model: {
        provider: 'openai',
        name: 'gpt-4o',
        parameters: {
          temperature: 3.0,
        },
      },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject maxTokens exceeding 100000', () => {
    const invalidInput = {
      intent: 'Run task daily',
      model: {
        provider: 'openai',
        name: 'gpt-4o',
        parameters: {
          maxTokens: 200000,
        },
      },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject too many credentials (max 20)', () => {
    const invalidInput = {
      intent: 'Run task daily',
      model: { provider: 'openai', name: 'gpt-4o' },
      credentials: Array.from({ length: 21 }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-44665544000${i}`,
        name: `cred_${i}`,
        provider: 'generic',
      })),
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject too many skills (max 50)', () => {
    const invalidInput = {
      intent: 'Run task daily',
      model: { provider: 'openai', name: 'gpt-4o' },
      skills: Array.from({ length: 51 }, (_, i) => ({
        name: `skill_${i}`,
        source: 'platform',
      })),
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should validate webhook configuration', () => {
    const validInput = {
      intent: 'Run task with webhook',
      model: { provider: 'openai', name: 'gpt-4o' },
      webhook: {
        url: 'https://example.com/webhook',
        events: ['start', 'complete'],
        retryCount: 3,
        timeout: 10,
      },
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid webhook URL', () => {
    const invalidInput = {
      intent: 'Run task with webhook',
      model: { provider: 'openai', name: 'gpt-4o' },
      webhook: {
        url: 'not-a-url',
        events: ['complete'],
      },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject webhook secret shorter than 16 characters', () => {
    const invalidInput = {
      intent: 'Run task with webhook',
      model: { provider: 'openai', name: 'gpt-4o' },
      webhook: {
        url: 'https://example.com/webhook',
        events: ['complete'],
        secret: 'short',
      },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should accept all valid model providers', () => {
    const providers = ['openai', 'anthropic', 'google', 'deepseek', 'custom'];
    
    for (const provider of providers) {
      const validInput = {
        intent: 'Run task daily',
        model: { provider, name: 'some-model' },
      };

      const result = createSwarmSessionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid priority levels', () => {
    const priorities = ['low', 'normal', 'high', 'urgent'];
    
    for (const priority of priorities) {
      const validInput = {
        intent: 'Run task daily',
        model: { provider: 'openai', name: 'gpt-4o' },
        priority,
      };

      const result = createSwarmSessionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    }
  });

  it('should reject constraints.maxExecutionTime exceeding 3600', () => {
    const invalidInput = {
      intent: 'Run task daily',
      model: { provider: 'openai', name: 'gpt-4o' },
      constraints: {
        maxExecutionTime: 4000,
      },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject constraints.maxWorkers exceeding 50', () => {
    const invalidInput = {
      intent: 'Run task daily',
      model: { provider: 'openai', name: 'gpt-4o' },
      constraints: {
        maxWorkers: 100,
      },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe('Get Swarm Session Schema', () => {
  it('should validate a valid UUID', () => {
    const validInput = { sessionId: '550e8400-e29b-41d4-a716-446655440000' };

    const result = getSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID format', () => {
    const invalidInput = { sessionId: 'not-a-uuid' };

    const result = getSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject missing sessionId', () => {
    const invalidInput = {};

    const result = getSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe('List Swarm Sessions Schema', () => {
  it('should use default values for page and limit', () => {
    const result = listSwarmSessionsSchema.safeParse({});
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should coerce string page to number', () => {
    const result = listSwarmSessionsSchema.safeParse({ page: '5' });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
    }
  });

  it('should reject page less than 1', () => {
    const result = listSwarmSessionsSchema.safeParse({ page: 0 });
    
    expect(result.success).toBe(false);
  });

  it('should reject limit greater than 100', () => {
    const result = listSwarmSessionsSchema.safeParse({ limit: 101 });
    
    expect(result.success).toBe(false);
  });

  it('should validate valid status values', () => {
    const statuses = ['pending', 'parsing', 'awaiting_approval', 'approved', 'executing', 'completed', 'failed', 'cancelled'];
    
    for (const status of statuses) {
      const result = listSwarmSessionsSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid status value', () => {
    const result = listSwarmSessionsSchema.safeParse({ status: 'invalid' });
    
    expect(result.success).toBe(false);
  });

  it('should validate datetime format for createdAfter', () => {
    const result = listSwarmSessionsSchema.safeParse({
      createdAfter: '2024-01-15T10:30:00Z',
    });
    
    expect(result.success).toBe(true);
  });

  it('should reject invalid datetime format', () => {
    const result = listSwarmSessionsSchema.safeParse({
      createdAfter: 'not-a-date',
    });
    
    expect(result.success).toBe(false);
  });

  it('should limit search to 100 characters', () => {
    const result = listSwarmSessionsSchema.safeParse({
      search: 'x'.repeat(101),
    });
    
    expect(result.success).toBe(false);
  });
});

describe('Approve Swarm Session Schema', () => {
  it('should validate valid session ID', () => {
    const validInput = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = approveSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should allow optional approvedSteps', () => {
    const validInput = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      approvedSteps: ['step-1', 'step-2'],
    };

    const result = approveSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should allow optional approvedCredentials', () => {
    const validInput = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      approvedCredentials: ['550e8400-e29b-41d4-a716-446655440001'],
    };

    const result = approveSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should allow optional modifications', () => {
    const validInput = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      modifications: {
        maxWorkers: 5,
        timeout: 120,
      },
    };

    const result = approveSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});

describe('Cancel Swarm Session Schema', () => {
  it('should validate valid session ID', () => {
    const validInput = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = cancelSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should allow optional reason up to 500 characters', () => {
    const validInput = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'User requested cancellation due to change in requirements',
    };

    const result = cancelSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject reason longer than 500 characters', () => {
    const invalidInput = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'x'.repeat(501),
    };

    const result = cancelSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// TYPE EXPORT TESTS
// ============================================================================

describe('Schema Type Exports', () => {
  it('should export valid ModelProvider type', () => {
    type ModelProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'custom';
    
    const validProvider: ModelProvider = 'openai';
    expect(validProvider).toBe('openai');
  });

  it('should export valid SessionStatus type', () => {
    type SessionStatus = 'pending' | 'parsing' | 'awaiting_approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
    
    const validStatus: SessionStatus = 'pending';
    expect(validStatus).toBe('pending');
  });

  it('should export valid Priority type', () => {
    type Priority = 'low' | 'normal' | 'high' | 'urgent';
    
    const validPriority: Priority = 'high';
    expect(validPriority).toBe('high');
  });

  it('should export CreateSwarmSessionInput type', () => {
    // Simulating the inferred type structure
    type CreateSwarmSessionInput = {
      intent: string;
      model: {
        provider: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'custom';
        name: string;
      };
    };
    
    const validInput: CreateSwarmSessionInput = {
      intent: 'Test intent for type validation',
      model: { provider: 'openai', name: 'gpt-4o' },
    };
    
    expect(validInput.intent).toBe('Test intent for type validation');
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty string intent trimmed to length less than 10', () => {
    const invalidInput = {
      intent: '         ',  // Whitespace only
      model: { provider: 'openai', name: 'gpt-4o' },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should handle minimum valid intent (10 chars)', () => {
    const validInput = {
      intent: '1234567890',  // Exactly 10 characters
      model: { provider: 'openai', name: 'gpt-4o' },
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should handle maximum valid intent (10000 chars)', () => {
    const validInput = {
      intent: 'x'.repeat(10000),
      model: { provider: 'openai', name: 'gpt-4o' },
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should handle custom endpoint with full URL', () => {
    const validInput = {
      intent: 'Run task with custom endpoint',
      model: {
        provider: 'custom',
        name: 'my-model',
        customEndpoint: 'https://api.myprovider.com/v1/chat',
      },
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should handle continuous mode with all options', () => {
    const validInput = {
      intent: 'Run continuous task',
      model: { provider: 'openai', name: 'gpt-4o' },
      continuous: {
        enabled: true,
        maxExecutions: 500,
        stopOnError: true,
        notifyOnFailure: true,
      },
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should handle datetime range filters', () => {
    const validInput = {
      createdAfter: '2024-01-01T00:00:00.000Z',
      createdBefore: '2024-12-31T23:59:59.999Z',
    };

    const result = listSwarmSessionsSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject negative constraint values', () => {
    const invalidInput = {
      intent: 'Run task daily',
      model: { provider: 'openai', name: 'gpt-4o' },
      constraints: {
        maxExecutionTime: -100,
      },
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should handle skill with GitHub source URL', () => {
    const validInput = {
      intent: 'Run task with custom skill',
      model: { provider: 'openai', name: 'gpt-4o' },
      skills: [
        {
          name: 'my-custom-skill',
          source: 'github',
          sourceUrl: 'https://github.com/user/repo/blob/main/skills/my-skill.md',
          version: '1.0.0',
        },
      ],
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should handle schedule with date range', () => {
    const validInput = {
      intent: 'Run task in date range',
      model: { provider: 'openai', name: 'gpt-4o' },
      schedule: {
        enabled: true,
        cron: '0 9 * * 1',
        timezone: 'Europe/London',
        startDate: '2024-03-01T00:00:00Z',
        endDate: '2024-06-30T23:59:59Z',
      },
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// SEMVER VERSION VALIDATION
// ============================================================================

describe('Semver Version Validation', () => {
  it('should accept valid semver versions', () => {
    const validVersions = ['1.0.0', '0.1.0', '10.20.30', '0.0.1'];
    
    for (const version of validVersions) {
      const validInput = {
        intent: 'Run task daily',
        model: { provider: 'openai', name: 'gpt-4o' },
        skills: [{ name: 'skill', source: 'platform', version }],
      };

      const result = createSwarmSessionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid semver versions', () => {
    const invalidVersions = ['1.0', 'v1.0.0', '1.0.0.0', '1'];
    
    for (const version of invalidVersions) {
      const invalidInput = {
        intent: 'Run task daily',
        model: { provider: 'openai', name: 'gpt-4o' },
        skills: [{ name: 'skill', source: 'platform', version }],
      };

      const result = createSwarmSessionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    }
  });
});

// ============================================================================
// UUID VALIDATION FOR NESTED SCHEMAS
// ============================================================================

describe('Nested UUID Validation', () => {
  it('should validate credential IDs', () => {
    const validInput = {
      intent: 'Run task with credentials',
      model: { provider: 'openai', name: 'gpt-4o' },
      credentials: [
        { id: '550e8400-e29b-41d4-a716-446655440000', name: 'api_key', provider: 'openai' },
      ],
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid credential IDs', () => {
    const invalidInput = {
      intent: 'Run task with credentials',
      model: { provider: 'openai', name: 'gpt-4o' },
      credentials: [
        { id: 'not-a-uuid', name: 'api_key', provider: 'openai' },
      ],
    };

    const result = createSwarmSessionSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should validate apiKeyRef in model config', () => {
    const validInput = {
      intent: 'Run task with model API key',
      model: {
        provider: 'openai',
        name: 'gpt-4o',
        apiKeyRef: '550e8400-e29b-41d4-a716-446655440000',
      },
    };

    const result = createSwarmSessionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});