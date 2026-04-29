/**
 * Items Controller Tests
 * 
 * Comprehensive tests covering:
 * - Input validation for all request types
 * - Schema validation with Zod
 * - Request parsing (body, query, params)
 * - Error responses with proper status codes
 * - Edge cases and boundary conditions
 * - Pagination behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  patchItem,
  deleteItem,
  clearItems,
  getItemCount,
} from './items.controller.js';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a mock Request object
 */
function createRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Request {
  return new Request(url, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Create a valid item
 */
function createValidItem(overrides: Partial<{
  name: string;
  description: string;
  price: number;
  quantity: number;
  tags: string[];
}> = {}): Parameters<typeof createRequest>[1]['body'] {
  return {
    name: 'Test Item',
    description: 'A test item description',
    price: 29.99,
    quantity: 10,
    tags: ['test', 'sample'],
    ...overrides,
  };
}

// ============================================================================
// VALID ITEM TESTS
// ============================================================================

describe('Item Controller - Valid Requests', () => {
  beforeEach(() => {
    clearItems();
  });

  describe('POST /items - Create Item', () => {
    it('should create an item with valid data', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe('Test Item');
      expect(body.data.description).toBe('A test item description');
      expect(body.data.price).toBe(29.99);
      expect(body.data.quantity).toBe(10);
      expect(body.data.tags).toEqual(['test', 'sample']);
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
      expect(response.headers.get('Location')).toContain('/items/');
      expect(response.headers.get('X-Request-ID')).toBeDefined();
    });

    it('should create an item with minimum required fields', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: {
          name: 'Minimal Item',
          price: 0,
          quantity: 0,
        },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Minimal Item');
      expect(body.data.description).toBe('');
      expect(body.data.tags).toEqual([]);
    });

    it('should accept item with decimal price', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: {
          name: 'Pricey Item',
          price: 99.99,
          quantity: 5,
        },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.price).toBe(99.99);
    });
  });

  describe('GET /items - List Items', () => {
    it('should list items with default pagination', async () => {
      // Create some items first
      for (let i = 0; i < 3; i++) {
        await createItem(createRequest('http://localhost/items', {
          method: 'POST',
          body: createValidItem({ name: `Item ${i}` }),
        }));
      }

      const request = createRequest('http://localhost/items');
      const response = await listItems(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(10);
      expect(body.meta.total).toBe(3);
      expect(body.meta.totalPages).toBe(1);
      expect(body.meta.hasNext).toBe(false);
      expect(body.meta.hasPrev).toBe(false);
    });

    it('should paginate results correctly', async () => {
      // Create 15 items
      for (let i = 0; i < 15; i++) {
        await createItem(createRequest('http://localhost/items', {
          method: 'POST',
          body: createValidItem({ name: `Item ${i}` }),
        }));
      }

      // Get first page with limit 5
      const request = createRequest('http://localhost/items?page=1&limit=5');
      const response = await listItems(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(5);
      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(5);
      expect(body.meta.total).toBe(15);
      expect(body.meta.totalPages).toBe(3);
      expect(body.meta.hasNext).toBe(true);
      expect(body.meta.hasPrev).toBe(false);
    });

    it('should return correct second page', async () => {
      // Create 15 items
      for (let i = 0; i < 15; i++) {
        await createItem(createRequest('http://localhost/items', {
          method: 'POST',
          body: createValidItem({ name: `Item ${i}` }),
        }));
      }

      const request = createRequest('http://localhost/items?page=2&limit=5');
      const response = await listItems(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(5);
      expect(body.meta.page).toBe(2);
      expect(body.meta.hasPrev).toBe(true);
    });
  });

  describe('GET /items/:id - Get Item', () => {
    it('should get an existing item by ID', async () => {
      // Create an item first
      const createResponse = await createItem(createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      }));
      const created = await createResponse.json();

      // Get the item
      const request = createRequest(`http://localhost/items/${created.data.id}`);
      const response = await getItem(request, { id: created.data.id });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(created.data.id);
      expect(body.data.name).toBe('Test Item');
    });

    it('should return 404 for non-existent item', async () => {
      const request = createRequest('http://localhost/items/00000000-0000-0000-0000-000000000000');
      const response = await getItem(request, { id: '00000000-0000-0000-0000-000000000000' });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toContain('not found');
    });
  });

  describe('PUT /items/:id - Replace Item', () => {
    it('should replace an existing item', async () => {
      // Create an item first
      const createResponse = await createItem(createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      }));
      const created = await createResponse.json();

      // Replace the item
      const request = createRequest(`http://localhost/items/${created.data.id}`, {
        method: 'PUT',
        body: createValidItem({
          name: 'Updated Item',
          price: 49.99,
          quantity: 20,
        }),
      });
      const response = await updateItem(request, { id: created.data.id });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Item');
      expect(body.data.price).toBe(49.99);
      expect(body.data.quantity).toBe(20);
      expect(body.data.createdAt).toBe(created.data.createdAt);
    });
  });

  describe('PATCH /items/:id - Partial Update', () => {
    it('should update only specified fields', async () => {
      // Create an item first
      const createResponse = await createItem(createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      }));
      const created = await createResponse.json();

      // Partial update
      const request = createRequest(`http://localhost/items/${created.data.id}`, {
        method: 'PATCH',
        body: { name: 'Partially Updated' },
      });
      const response = await patchItem(request, { id: created.data.id });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Partially Updated');
      // Other fields should remain unchanged
      expect(body.data.price).toBe(29.99);
      expect(body.data.quantity).toBe(10);
    });
  });

  describe('DELETE /items/:id - Delete Item', () => {
    it('should delete an existing item', async () => {
      // Create an item first
      const createResponse = await createItem(createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      }));
      const created = await createResponse.json();

      // Delete the item
      const request = createRequest(`http://localhost/items/${created.data.id}`, {
        method: 'DELETE',
      });
      const response = await deleteItem(request, { id: created.data.id });

      expect(response.status).toBe(204);

      // Verify item is deleted
      const getRequest = createRequest(`http://localhost/items/${created.data.id}`);
      const getResponse = await getItem(getRequest, { id: created.data.id });
      expect(getResponse.status).toBe(404);
    });
  });
});

// ============================================================================
// INPUT VALIDATION TESTS
// ============================================================================

describe('Item Controller - Input Validation', () => {
  beforeEach(() => {
    clearItems();
  });

  describe('POST /items - Body Validation', () => {
    it('should reject missing name', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: {
          price: 10,
          quantity: 5,
        },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.name).toContain('Name is required');
    });

    it('should reject empty name', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ name: '' }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details.name).toContain('Name is required');
    });

    it('should reject name exceeding 100 characters', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ name: 'a'.repeat(101) }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details.name).toContain('at most 100 characters');
    });

    it('should reject missing price', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: {
          name: 'Test Item',
          quantity: 5,
        },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details.price).toContain('Price is required');
    });

    it('should reject negative price', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ price: -10 }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details.price).toContain('Price must be >= 0');
    });

    it('should reject missing quantity', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: {
          name: 'Test Item',
          price: 10,
        },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details.quantity).toContain('Quantity is required');
    });

    it('should reject non-integer quantity', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ quantity: 5.5 }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details.quantity).toContain('Quantity must be an integer');
    });

    it('should reject negative quantity', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ quantity: -1 }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details.quantity).toContain('Quantity must be >= 0');
    });

    it('should reject description exceeding 500 characters', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ description: 'a'.repeat(501) }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details.description).toContain('at most 500 characters');
    });

    it('should trim whitespace from name', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ name: '  Trimmed Name  ' }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.name).toBe('Trimmed Name');
    });

    it('should reject invalid tags format', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ tags: 'not-an-array' as unknown as string[] }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
    });

    it('should accept valid tags array', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ tags: ['tag1', 'tag2', 'tag3'] }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('PATCH /items/:id - Partial Update Validation', () => {
    it('should reject empty body', async () => {
      const createResponse = await createItem(createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      }));
      const created = await createResponse.json();

      const request = createRequest(`http://localhost/items/${created.data.id}`, {
        method: 'PATCH',
        body: {},
      });
      const response = await patchItem(request, { id: created.data.id });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.message).toContain('At least one field');
    });

    it('should accept single field update', async () => {
      const createResponse = await createItem(createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      }));
      const created = await createResponse.json();

      const request = createRequest(`http://localhost/items/${created.data.id}`, {
        method: 'PATCH',
        body: { price: 99.99 },
      });
      const response = await patchItem(request, { id: created.data.id });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.price).toBe(99.99);
    });
  });

  describe('Query Parameter Validation', () => {
    it('should reject invalid page number', async () => {
      const request = createRequest('http://localhost/items?page=0');
      const response = await listItems(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details.page).toContain('Number must be >= 1');
    });

    it('should reject negative page number', async () => {
      const request = createRequest('http://localhost/items?page=-1');
      const response = await listItems(request);
      const body = await response.json();

      expect(response.status).toBe(400);
    });

    it('should reject page exceeding 100', async () => {
      const request = createRequest('http://localhost/items?limit=101');
      const response = await listItems(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details.limit).toContain('Number must be <= 100');
    });

    it('should coerce string page to number', async () => {
      const request = createRequest('http://localhost/items?page=2');
      const response = await listItems(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.meta.page).toBe(2);
    });
  });

  describe('Path Parameter Validation', () => {
    it('should reject invalid UUID format', async () => {
      const request = createRequest('http://localhost/items/invalid-id');
      const response = await getItem(request, { id: 'invalid-id' });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.id).toBeDefined();
    });

    it('should reject UUID with wrong format', async () => {
      const request = createRequest('http://localhost/items/12345');
      const response = await getItem(request, { id: '12345' });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details.id).toContain('Invalid ID format');
    });
  });
});

// ============================================================================
// REQUEST PARSING TESTS
// ============================================================================

describe('Item Controller - Request Parsing', () => {
  beforeEach(() => {
    clearItems();
  });

  describe('JSON Body Parsing', () => {
    it('should reject non-JSON body', async () => {
      const request = new Request('http://localhost/items', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not json',
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.message).toContain('Invalid JSON');
    });

    it('should handle empty body', async () => {
      const request = new Request('http://localhost/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.message).toContain('Invalid JSON');
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json}',
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.message).toContain('Invalid JSON');
    });

    it('should parse valid JSON body', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data).toBeDefined();
    });
  });

  describe('Request ID Handling', () => {
    it('should use provided request ID', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
        headers: { 'X-Request-ID': 'custom-request-id-123' },
      });

      const response = await createItem(request);

      expect(response.headers.get('X-Request-ID')).toBe('custom-request-id-123');
    });

    it('should generate request ID if not provided', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      });

      const response = await createItem(request);

      expect(response.headers.get('X-Request-ID')).toMatch(/^req_/);
    });
  });
});

// ============================================================================
// ERROR RESPONSE FORMAT TESTS
// ============================================================================

describe('Item Controller - Error Response Format', () => {
  beforeEach(() => {
    clearItems();
  });

  describe('Validation Error Response', () => {
    it('should include error code', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: { price: 10, quantity: 5 },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should include human-readable message', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: { price: 10, quantity: 5 },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(body.error.message).toBe('Invalid request body');
    });

    it('should include field-level error details', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: { price: 10, quantity: 5 },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(body.error.details).toBeDefined();
      expect(body.error.details.name).toBeDefined();
      expect(Array.isArray(body.error.details.name)).toBe(true);
    });

    it('should include request ID', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: { price: 10, quantity: 5 },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(body.error.requestId).toBeDefined();
    });
  });

  describe('Not Found Error Response', () => {
    it('should include NOT_FOUND code', async () => {
      const request = createRequest('http://localhost/items/00000000-0000-0000-0000-000000000000');
      const response = await getItem(request, { id: '00000000-0000-0000-0000-000000000000' });
      const body = await response.json();

      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should include helpful message with ID', async () => {
      const request = createRequest('http://localhost/items/00000000-0000-0000-0000-000000000000');
      const response = await getItem(request, { id: '00000000-0000-0000-0000-000000000000' });
      const body = await response.json();

      expect(body.error.message).toContain('00000000-0000-0000-0000-000000000000');
    });
  });

  describe('Success Response Format', () => {
    it('should include success: true', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(body.success).toBe(true);
    });

    it('should include data field', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBeDefined();
    });

    it('should include request ID', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(body.requestId).toBeDefined();
    });
  });

  describe('Content-Type Header', () => {
    it('should return application/json content type', async () => {
      const request = createRequest('http://localhost/items');
      const response = await listItems(request);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should include location header for created resources', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      });

      const response = await createItem(request);

      expect(response.headers.get('Location')).toContain('/items/');
    });

    it('should not include content body for 204 responses', async () => {
      const createResponse = await createItem(createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      }));
      const created = await createResponse.json();

      const request = createRequest(`http://localhost/items/${created.data.id}`, {
        method: 'DELETE',
      });
      const response = await deleteItem(request, { id: created.data.id });

      expect(response.status).toBe(204);
      expect(response.headers.get('Content-Type')).toBeNull();
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Item Controller - Edge Cases', () => {
  beforeEach(() => {
    clearItems();
  });

  describe('Boundary Conditions', () => {
    it('should handle minimum valid name (1 char)', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ name: 'A' }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.name).toBe('A');
    });

    it('should handle maximum valid name (100 chars)', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ name: 'a'.repeat(100) }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
    });

    it('should handle zero price', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ price: 0 }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.price).toBe(0);
    });

    it('should handle zero quantity', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ quantity: 0 }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.quantity).toBe(0);
    });

    it('should handle very large quantity', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ quantity: Number.MAX_SAFE_INTEGER }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
    });
  });

  describe('Special Characters', () => {
    it('should handle Unicode characters in name', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ name: '日本語テスト 🎉' }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.name).toBe('日本語テスト 🎉');
    });

    it('should handle emojis in tags', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ tags: ['🔥', '✨', '💯'] }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.tags).toEqual(['🔥', '✨', '💯']);
    });

    it('should handle special characters in description', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ description: '<script>alert("XSS")</script>' }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.description).toBe('<script>alert("XSS")</script>');
    });
  });

  describe('Empty and Null Values', () => {
    it('should handle empty tags array', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ tags: [] }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.tags).toEqual([]);
    });

    it('should handle missing tags (defaults to empty array)', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: {
          name: 'Test',
          price: 10,
          quantity: 5,
        },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.tags).toEqual([]);
    });

    it('should handle missing description (defaults to empty string)', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: {
          name: 'Test',
          price: 10,
          quantity: 5,
        },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.description).toBe('');
    });
  });

  describe('Numeric Edge Cases', () => {
    it('should handle very large price', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ price: 999999999999.99 }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.price).toBe(999999999999.99);
    });

    it('should handle small decimal price', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem({ price: 0.01 }),
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.price).toBe(0.01);
    });

    it('should handle page 1 explicitly', async () => {
      const request = createRequest('http://localhost/items?page=1');
      const response = await listItems(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.meta.page).toBe(1);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous creates', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        createItem(createRequest('http://localhost/items', {
          method: 'POST',
          body: createValidItem({ name: `Concurrent Item ${i}` }),
        }))
      );

      const results = await Promise.all(promises);

      expect(results.every(r => r.status === 201)).toBe(true);
      expect(getItemCount()).toBe(5);
    });

    it('should handle operations on different items', async () => {
      // Create multiple items
      const created: { id: string }[] = [];
      for (let i = 0; i < 3; i++) {
        const response = await createItem(createRequest('http://localhost/items', {
          method: 'POST',
          body: createValidItem({ name: `Item ${i}` }),
        }));
        created.push(await response.json());
      }

      // Patch each item
      for (const item of created) {
        const patchResponse = await patchItem(
          createRequest(`http://localhost/items/${item.id}`, {
            method: 'PATCH',
            body: { price: 99.99 },
          }),
          { id: item.id }
        );
        expect(patchResponse.status).toBe(200);
      }

      // Verify all prices updated
      for (const item of created) {
        const getResponse = await getItem(
          createRequest(`http://localhost/items/${item.id}`),
          { id: item.id }
        );
        const body = await getResponse.json();
        expect(body.data.price).toBe(99.99);
      }
    });
  });
});

// ============================================================================
// SECURITY CONSIDERATIONS
// ============================================================================

describe('Item Controller - Security Considerations', () => {
  beforeEach(() => {
    clearItems();
  });

  describe('Input Sanitization', () => {
    it('should not execute potentially malicious input', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: {
          name: '<img src=x onerror=alert(1)>',
          price: 10,
          quantity: 5,
        },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      // The input is stored as-is; it's the frontend's responsibility to sanitize before rendering
      expect(body.data.name).toBe('<img src=x onerror=alert(1)>');
    });

    it('should handle SQL injection attempts in names', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: {
          name: "'; DROP TABLE items; --",
          price: 10,
          quantity: 5,
        },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.name).toBe("'; DROP TABLE items; --");
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not leak internal stack traces', async () => {
      const request = createRequest('http://localhost/items', {
        method: 'POST',
        body: { name: 'Test' },
      });

      const response = await createItem(request);
      const body = await response.json();

      expect(body.error.stack).toBeUndefined();
      expect(body.error.code).not.toContain('undefined');
    });

    it('should not include sensitive data in error responses', async () => {
      // Create an item to delete
      const createResponse = await createItem(createRequest('http://localhost/items', {
        method: 'POST',
        body: createValidItem(),
      }));
      const created = await createResponse.json();

      // Try to get non-existent item
      const request = createRequest(`http://localhost/items/${created.data.id}`);
      const response = await getItem(request, { id: created.data.id });
      const body = await response.json();

      expect(Object.keys(body)).not.toContain('stack');
      expect(Object.keys(body)).not.toContain('cause');
    });
  });
});