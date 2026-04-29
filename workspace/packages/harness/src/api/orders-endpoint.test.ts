/**
 * Orders API Endpoint - Comprehensive Test Suite
 * 
 * Tests cover:
 * - Schema validation
 * - Input sanitization
 * - Request parsing
 * - CRUD operations
 * - Error handling
 * - Edge cases
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  // Schemas
  createOrderSchema,
  updateOrderSchema,
  patchOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
  orderIdParamSchema,
  orderItemSchema,
  addressSchema,
  // Validation utilities
  validate,
  validateSafe,
  sanitizeInput,
  // Parsers
  parseBody,
  parseQuery,
  parseParams,
  // Response helpers
  createSuccessResponse,
  createErrorResponse,
  // Service
  orderService,
  // Types
  type CreateOrderInput,
  type PatchOrderInput,
} from './orders-endpoint.js';

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

const validAddress = {
  street: '123 Main Street',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'United States',
};

const validOrderItem = {
  productId: '550e8400-e29b-41d4-a716-446655440000',
  productName: 'Premium Widget',
  quantity: 2,
  unitPrice: 29.99,
  discount: 10,
};

const validOrderInput: CreateOrderInput = {
  customerId: '550e8400-e29b-41d4-a716-446655440001',
  items: [validOrderItem],
  shippingAddress: validAddress,
  billingAddress: validAddress,
  notes: 'Please handle with care',
  priority: 'high',
  tags: ['fragile', 'priority'],
};

const mockRequest = (body: unknown, method = 'POST', url = 'http://localhost/orders') => {
  const bodyStr = JSON.stringify(body);
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'content-length': bodyStr.length.toString(),
    },
    body: bodyStr,
  });
};

const mockQueryRequest = (params: Record<string, string>, baseUrl = 'http://localhost/orders') => {
  const searchParams = new URLSearchParams(params);
  return new Request(`${baseUrl}?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'content-length': '0' },
  });
};

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe('Schema Validation - Order Item', () => {
  it('validates a valid order item', () => {
    const result = validateSafe(orderItemSchema, validOrderItem);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productName).toBe('Premium Widget');
      expect(result.data.quantity).toBe(2);
      expect(result.data.discount).toBe(10);
    }
  });

  it('rejects invalid productId (not a UUID)', () => {
    const result = validateSafe(orderItemSchema, {
      ...validOrderItem,
      productId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].path).toBe('productId');
    }
  });

  it('rejects negative quantity', () => {
    const result = validateSafe(orderItemSchema, {
      ...validOrderItem,
      quantity: -1,
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.path === 'quantity')).toBe(true);
  });

  it('rejects quantity exceeding maximum', () => {
    const result = validateSafe(orderItemSchema, {
      ...validOrderItem,
      quantity: 10001,
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.code === 'too_big')).toBe(true);
  });

  it('rejects negative unit price', () => {
    const result = validateSafe(orderItemSchema, {
      ...validOrderItem,
      unitPrice: -10,
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.code === 'too_small')).toBe(true);
  });

  it('rejects discount over 100%', () => {
    const result = validateSafe(orderItemSchema, {
      ...validOrderItem,
      discount: 150,
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.code === 'too_big')).toBe(true);
  });

  it('accepts missing discount (defaults to 0)', () => {
    const { discount, ...itemWithoutDiscount } = validOrderItem;
    const result = validateSafe(orderItemSchema, itemWithoutDiscount);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.discount).toBe(0);
    }
  });
});

describe('Schema Validation - Address', () => {
  it('validates a valid address', () => {
    const result = validateSafe(addressSchema, validAddress);
    expect(result.success).toBe(true);
  });

  it('rejects invalid postal code (5 digits required)', () => {
    const result = validateSafe(addressSchema, {
      ...validAddress,
      postalCode: '1234',
    });
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('postal code');
  });

  it('accepts ZIP+4 format', () => {
    const result = validateSafe(addressSchema, {
      ...validAddress,
      postalCode: '10001-1234',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing country (defaults to United States)', () => {
    const { country, ...addrWithoutCountry } = validAddress;
    const result = validateSafe(addressSchema, addrWithoutCountry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe('United States');
    }
  });

  it('rejects empty street', () => {
    const result = validateSafe(addressSchema, {
      ...validAddress,
      street: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('Schema Validation - Create Order', () => {
  it('validates a complete valid order', () => {
    const result = validateSafe(createOrderSchema, validOrderInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerId).toBe(validOrderInput.customerId);
      expect(result.data.items).toHaveLength(1);
      expect(result.data.priority).toBe('high');
    }
  });

  it('rejects order without items', () => {
    const result = validateSafe(createOrderSchema, {
      ...validOrderInput,
      items: [],
    });
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('At least one item');
  });

  it('rejects order with more than 100 items', () => {
    const result = validateSafe(createOrderSchema, {
      ...validOrderInput,
      items: Array(101).fill(validOrderItem),
    });
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('too_big');
  });

  it('rejects invalid priority value', () => {
    const result = validateSafe(createOrderSchema, {
      ...validOrderInput,
      priority: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects notes exceeding 1000 characters', () => {
    const result = validateSafe(createOrderSchema, {
      ...validOrderInput,
      notes: 'x'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts order without optional fields', () => {
    const minimalOrder = {
      customerId: validOrderInput.customerId,
      items: [validOrderItem],
      shippingAddress: validAddress,
    };
    const result = validateSafe(createOrderSchema, minimalOrder);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe('');
      expect(result.data.priority).toBe('normal');
      expect(result.data.tags).toEqual([]);
    }
  });

  it('rejects more than 10 tags', () => {
    const result = validateSafe(createOrderSchema, {
      ...validOrderInput,
      tags: Array(11).fill('tag'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects tag exceeding 50 characters', () => {
    const result = validateSafe(createOrderSchema, {
      ...validOrderInput,
      tags: ['a'.repeat(51)],
    });
    expect(result.success).toBe(false);
  });
});

describe('Schema Validation - Patch Order', () => {
  it('validates patch with single field', () => {
    const result = validateSafe(patchOrderSchema, {
      priority: 'urgent',
    });
    expect(result.success).toBe(true);
  });

  it('validates patch with multiple fields', () => {
    const result = validateSafe(patchOrderSchema, {
      priority: 'urgent',
      notes: 'Updated notes',
      status: 'processing',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty patch (at least one field required)', () => {
    const result = validateSafe(patchOrderSchema, {});
    expect(result.success).toBe(false);
  });

  it('rejects patch with only undefined values', () => {
    const result = validateSafe(patchOrderSchema, {
      notes: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('validates status transition', () => {
    const result = validateSafe(patchOrderSchema, {
      status: 'shipped',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status value', () => {
    const result = validateSafe(patchOrderSchema, {
      status: 'invalid_status',
    });
    expect(result.success).toBe(false);
  });
});

describe('Schema Validation - Query Parameters', () => {
  it('validates empty query (uses defaults)', () => {
    const result = validateSafe(orderQuerySchema, {});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sort).toBe('createdAt');
      expect(result.data.order).toBe('desc');
    }
  });

  it('validates full query with all parameters', () => {
    const result = validateSafe(orderQuerySchema, {
      page: '2',
      limit: '50',
      sort: 'total',
      order: 'asc',
      status: 'pending',
      customerId: '550e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(true);
  });

  it('coerces string values to numbers', () => {
    const result = validateSafe(orderQuerySchema, {
      page: '5',
      limit: '25',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
      expect(result.data.limit).toBe(25);
    }
  });

  it('rejects invalid sort field', () => {
    const result = validateSafe(orderQuerySchema, {
      sort: 'invalid_field',
    });
    expect(result.success).toBe(false);
  });

  it('rejects limit exceeding maximum', () => {
    const result = validateSafe(orderQuerySchema, {
      limit: '101',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative page', () => {
    const result = validateSafe(orderQuerySchema, {
      page: '-1',
    });
    expect(result.success).toBe(false);
  });
});

describe('Schema Validation - Path Parameters', () => {
  it('validates valid UUID', () => {
    const result = validateSafe(orderIdParamSchema, {
      id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID format', () => {
    const result = validateSafe(orderIdParamSchema, {
      id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty ID', () => {
    const result = validateSafe(orderIdParamSchema, {
      id: '',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// INPUT SANITIZATION TESTS
// ============================================================================

describe('Input Sanitization', () => {
  it('trims whitespace from strings', () => {
    const input = { name: '  hello world  ', value: 42 };
    const result = sanitizeInput(input);
    expect(result.name).toBe('hello world');
  });

  it('normalizes multiple spaces to single space', () => {
    const input = { name: 'hello    world   test' };
    const result = sanitizeInput(input);
    expect(result.name).toBe('hello world test');
  });

  it('sanitizes array of strings', () => {
    const input = { tags: ['  tag1  ', '  tag2  '] };
    const result = sanitizeInput(input);
    expect(result.tags).toEqual(['tag1', 'tag2']);
  });

  it('filters out empty strings from arrays', () => {
    const input = { tags: ['valid', '  ', ''] };
    const result = sanitizeInput(input);
    expect(result.tags).toEqual(['valid']);
  });

  it('preserves non-string values', () => {
    const input = { count: 42, active: true, nested: { a: 1 } };
    const result = sanitizeInput(input);
    expect(result).toEqual(input);
  });

  it('handles deeply nested objects', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            name: '  deeply nested  ',
          },
        },
      },
    };
    const result = sanitizeInput(input);
    expect((result as any).level1.level2.level3.name).toBe('deeply nested');
  });
});

// ============================================================================
// REQUEST PARSING TESTS
// ============================================================================

describe('Request Parsing - parseBody', () => {
  it('parses valid request body', async () => {
    const request = mockRequest(validOrderInput);
    const result = await parseBody(request, createOrderSchema);
    expect(result.success).toBe(true);
  });

  it('rejects non-JSON content type', async () => {
    const request = new Request('http://localhost/orders', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify(validOrderInput),
    });
    const result = await parseBody(request, createOrderSchema);
    expect(result.success).toBe(false);
    expect(result.response.status).toBe(415);
  });

  it('rejects oversized payload', async () => {
    const hugeBody = { data: 'x'.repeat(1_000_001) };
    const request = mockRequest(hugeBody);
    const result = await parseBody(request, createOrderSchema);
    expect(result.success).toBe(false);
    expect(result.response.status).toBe(413);
  });

  it('rejects invalid JSON', async () => {
    const request = new Request('http://localhost/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '20',
      },
      body: 'not valid json',
    });
    const result = await parseBody(request, createOrderSchema);
    expect(result.success).toBe(false);
    expect(result.response.status).toBe(400);
  });

  it('sanitizes input before validation', async () => {
    const dirtyInput = {
      ...validOrderInput,
      notes: '  dirty   notes  ',
      tags: ['  tag1  ', '  tag2  '],
    };
    const request = mockRequest(dirtyInput);
    const result = await parseBody(request, createOrderSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe('dirty notes');
      expect(result.data.tags).toEqual(['tag1', 'tag2']);
    }
  });

  it('returns validation errors with details', async () => {
    const invalidInput = { customerId: 'not-a-uuid', items: [] };
    const request = mockRequest(invalidInput);
    const result = await parseBody(request, createOrderSchema);
    expect(result.success).toBe(false);
    
    const response = await result.response.json();
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('VALIDATION_ERROR');
    expect(response.error.details).toBeDefined();
    expect(response.error.details.length).toBeGreaterThan(0);
  });
});

describe('Request Parsing - parseQuery', () => {
  it('parses valid query parameters', () => {
    const url = new URL('/orders?page=2&limit=50&status=pending');
    const result = parseQuery(url, orderQuerySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
      expect(result.data.status).toBe('pending');
    }
  });

  it('uses defaults for missing parameters', () => {
    const url = new URL('/orders');
    const result = parseQuery(url, orderQuerySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('returns errors for invalid parameters', () => {
    const url = new URL('/orders?page=invalid&limit=abc');
    const result = parseQuery(url, orderQuerySchema);
    expect(result.success).toBe(false);
  });
});

describe('Request Parsing - parseParams', () => {
  it('parses valid path parameters', () => {
    const result = parseParams(
      { id: '550e8400-e29b-41d4-a716-446655440000' },
      orderIdParamSchema
    );
    expect(result.success).toBe(true);
  });

  it('returns error for invalid ID', () => {
    const result = parseParams({ id: 'invalid' }, orderIdParamSchema);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// RESPONSE HELPER TESTS
// ============================================================================

describe('Response Helpers', () => {
  it('creates success response with metadata', () => {
    const response = createSuccessResponse(
      { id: '123', name: 'Test' },
      'req_123',
      { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
    );
    expect(response.success).toBe(true);
    expect(response.data.name).toBe('Test');
    expect(response.requestId).toBe('req_123');
    expect(response.timestamp).toBeDefined();
    expect(response.meta?.page).toBe(1);
  });

  it('creates error response without details', () => {
    const response = createErrorResponse('NOT_FOUND', 'Resource not found', 'req_456');
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('NOT_FOUND');
    expect(response.error.message).toBe('Resource not found');
    expect(response.error.details).toBeUndefined();
  });

  it('creates error response with validation details', () => {
    const details = [
      { path: 'name', message: 'Name is required', code: 'too_small' },
    ];
    const response = createErrorResponse('VALIDATION_ERROR', 'Invalid input', 'req_789', details);
    expect(response.success).toBe(false);
    expect(response.error.details).toHaveLength(1);
    expect(response.error.details?.[0].path).toBe('name');
  });
});

// ============================================================================
// ORDER SERVICE TESTS
// ============================================================================

describe('Order Service', () => {
  beforeEach(() => {
    orderService.clear();
  });

  describe('create', () => {
    it('creates a new order with generated ID', () => {
      const order = orderService.create(validOrderInput);
      expect(order.id).toBeDefined();
      expect(order.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('calculates totals correctly', () => {
      const order = orderService.create(validOrderInput);
      // 2 * 29.99 = 59.98, 10% discount = 5.998, taxable = 53.982, tax = 4.31856, total = 58.30
      expect(order.subtotal).toBeCloseTo(59.98, 2);
      expect(order.discount).toBeCloseTo(6.00, 1);
      expect(order.tax).toBeCloseTo(4.32, 2);
      expect(order.total).toBeCloseTo(58.30, 2);
    });

    it('sets default status to pending', () => {
      const order = orderService.create(validOrderInput);
      expect(order.status).toBe('pending');
    });

    it('uses billing address when provided', () => {
      const differentBilling = { ...validAddress, street: '456 Other Street' };
      const input = { ...validOrderInput, billingAddress: differentBilling };
      const order = orderService.create(input);
      expect(order.billingAddress?.street).toBe('456 Other Street');
    });

    it('defaults billing to shipping when not provided', () => {
      const { billingAddress, ...inputWithoutBilling } = validOrderInput;
      const order = orderService.create(inputWithoutBilling as CreateOrderInput);
      expect(order.billingAddress?.street).toBe(validAddress.street);
    });
  });

  describe('getById', () => {
    it('retrieves created order by ID', () => {
      const created = orderService.create(validOrderInput);
      const retrieved = orderService.getById(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.customerId).toBe(validOrderInput.customerId);
    });

    it('returns null for non-existent ID', () => {
      const retrieved = orderService.getById('550e8400-e29b-41d4-a716-446655440999');
      expect(retrieved).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      // Create test orders
      for (let i = 0; i < 25; i++) {
        const input = {
          ...validOrderInput,
          customerId: i < 10 
            ? '550e8400-e29b-41d4-a716-446655440001' 
            : '550e8400-e29b-41d4-a716-446655440002',
          priority: (['low', 'normal', 'high'] as const)[i % 3],
        };
        orderService.create(input);
      }
    });

    it('returns paginated results', () => {
      const result = orderService.list({ page: 1, limit: 10, sort: 'createdAt', order: 'desc' });
      expect(result.orders).toHaveLength(10);
      expect(result.meta.total).toBe(25);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrev).toBe(false);
    });

    it('returns correct page', () => {
      const result = orderService.list({ page: 2, limit: 10, sort: 'createdAt', order: 'desc' });
      expect(result.orders).toHaveLength(10);
      expect(result.meta.hasPrev).toBe(true);
    });

    it('filters by status', () => {
      const result = orderService.list({ page: 1, limit: 20, sort: 'createdAt', order: 'desc', status: 'pending' });
      expect(result.orders.every(o => o.status === 'pending')).toBe(true);
    });

    it('filters by customer ID', () => {
      const result = orderService.list({ 
        page: 1, 
        limit: 20, 
        sort: 'createdAt', 
        order: 'desc',
        customerId: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.orders.every(o => o.customerId === '550e8400-e29b-41d4-a716-446655440001')).toBe(true);
    });

    it('sorts by different fields', () => {
      const result = orderService.list({ page: 1, limit: 20, sort: 'total', order: 'asc' });
      expect(result.orders.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('replaces entire order', () => {
      const created = orderService.create(validOrderInput);
      const newInput = {
        ...validOrderInput,
        priority: 'urgent' as const,
        notes: 'Updated notes',
      };
      const updated = orderService.update(created.id, newInput);
      expect(updated).not.toBeNull();
      expect(updated?.priority).toBe('urgent');
      expect(updated?.notes).toBe('Updated notes');
      expect(updated?.createdAt).toBe(created.createdAt);
      expect(updated?.updatedAt).not.toBe(created.updatedAt);
    });

    it('returns null for non-existent order', () => {
      const result = orderService.update('550e8400-e29b-41d4-a716-446655440999', validOrderInput);
      expect(result).toBeNull();
    });
  });

  describe('patch', () => {
    it('updates only specified fields', () => {
      const created = orderService.create(validOrderInput);
      const patched = orderService.patch(created.id, { priority: 'urgent' });
      expect(patched).not.toBeNull();
      expect(patched?.priority).toBe('urgent');
      expect(patched?.customerId).toBe(created.customerId);
    });

    it('recalculates totals when items change', () => {
      const created = orderService.create(validOrderInput);
      const newItems = [
        {
          ...validOrderItem,
          quantity: 5,
          unitPrice: 49.99,
        },
      ];
      const patched = orderService.patch(created.id, { items: newItems });
      expect(patched?.subtotal).toBeGreaterThan(created.subtotal);
    });

    it('returns null for non-existent order', () => {
      const result = orderService.patch('550e8400-e29b-41d4-a716-446655440999', { priority: 'low' });
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('updates order status', () => {
      const created = orderService.create(validOrderInput);
      const updated = orderService.updateStatus(created.id, { status: 'shipped' });
      expect(updated?.status).toBe('shipped');
    });

    it('preserves other fields', () => {
      const created = orderService.create(validOrderInput);
      const updated = orderService.updateStatus(created.id, { status: 'processing' });
      expect(updated?.priority).toBe(created.priority);
      expect(updated?.total).toBe(created.total);
    });
  });

  describe('delete', () => {
    it('removes order from storage', () => {
      const created = orderService.create(validOrderInput);
      const deleted = orderService.delete(created.id);
      expect(deleted).toBe(true);
      expect(orderService.getById(created.id)).toBeNull();
    });

    it('returns false for non-existent order', () => {
      const result = orderService.delete('550e8400-e29b-41d4-a716-446655440999');
      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// EDGE CASES & BOUNDARY TESTS
// ============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    orderService.clear();
  });

  it('handles empty string arrays', () => {
    const input = {
      ...validOrderInput,
      tags: ['', '  ', 'valid'],
    };
    const request = mockRequest(input);
    const result = validate(createOrderSchema, input);
    expect(result.tags).toContain('valid');
    expect(result.tags).not.toContain('');
  });

  it('handles zero values correctly', () => {
    const input = {
      ...validOrderInput,
      items: [{
        ...validOrderItem,
        unitPrice: 0,
        discount: 0,
        quantity: 1,
      }],
    };
    const result = validate(createOrderSchema, input);
    expect(result.items[0].unitPrice).toBe(0);
  });

  it('handles decimal quantities (rejected as integers)', () => {
    const result = validateSafe(orderItemSchema, {
      ...validOrderItem,
      quantity: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it('handles very long product names', () => {
    const result = validateSafe(orderItemSchema, {
      ...validOrderItem,
      productName: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('handles maximum valid values', () => {
    const maxItem = {
      productId: '550e8400-e29b-41d4-a716-446655440000',
      productName: 'Max Product',
      quantity: 10000,
      unitPrice: 999999.99,
      discount: 100,
    };
    const result = validateSafe(orderItemSchema, maxItem);
    expect(result.success).toBe(true);
  });

  it('handles special characters in notes', () => {
    const input = {
      ...validOrderInput,
      notes: 'Special chars: <>&"\'{}[]|\\^~`',
    };
    const result = validate(createOrderSchema, input);
    expect(result.notes).toBe('Special chars: <>&"\'{}[]|\\^~`');
  });

  it('handles unicode characters', () => {
    const input = {
      ...validOrderInput,
      notes: 'Unicode: 你好 🌍 émojis: 🚀',
    };
    const result = validate(createOrderSchema, input);
    expect(result.notes).toBeTruthy();
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance', () => {
  beforeEach(() => {
    orderService.clear();
  });

  it('handles large order creation efficiently', () => {
    const largeOrder = {
      customerId: '550e8400-e29b-41d4-a716-446655440001',
      items: Array(100).fill({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        productName: 'Test Product',
        quantity: 1,
        unitPrice: 10,
      }),
      shippingAddress: validAddress,
    };
    
    const start = performance.now();
    orderService.create(largeOrder);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
  });

  it('handles bulk queries efficiently', () => {
    // Create 100 orders
    for (let i = 0; i < 100; i++) {
      orderService.create(validOrderInput);
    }
    
    const start = performance.now();
    const result = orderService.list({ page: 1, limit: 50, sort: 'createdAt', order: 'desc' });
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(50); // Should complete in under 50ms
    expect(result.orders).toHaveLength(50);
  });
});