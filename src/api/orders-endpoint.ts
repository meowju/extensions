/**
 * REST API Validation Example - Orders Endpoint
 * 
 * A complete demonstration of REST API endpoint design with:
 * - Comprehensive Zod schema validation
 * - Input sanitization
 * - Type-safe request/response handling
 * - Proper error responses
 * 
 * @module orders-api
 */

import { z, ZodSchema, ZodError, ZodIssueCode } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/**
 * Validation error with detailed field-level information
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{ path: string; message: string; code: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errors: this.errors,
    };
  }

  toResponse(statusCode = 400) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: this.message,
        details: this.errors,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Not found error
 */
export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with ID '${id}' not found`);
    this.name = 'NotFoundError';
    Error.captureStackTrace?.(this, this.constructor);
  }

  toResponse() {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: this.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// ============================================================================
// SCHEMA UTILITIES
// ============================================================================

/**
 * Sanitize a string by trimming and normalizing whitespace
 */
function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize an array of strings
 */
function sanitizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === 'string')
    .map((item) => sanitizeString(item))
    .filter((item) => item.length > 0);
}

/**
 * Coerce to positive integer with default
 */
function coercePositiveInt(input: unknown, defaultValue: number): number {
  const num = Number(input);
  if (Number.isNaN(num) || num < 1) return defaultValue;
  return Math.floor(num);
}

// ============================================================================
// ORDER SCHEMAS
// ============================================================================

// ----- Item Schema -----
export const orderItemSchema = z.object({
  productId: z
    .string()
    .uuid({ message: 'Product ID must be a valid UUID' }),
  productName: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be at most 200 characters'),
  quantity: z
    .number()
    .int({ message: 'Quantity must be an integer' })
    .min(1, 'Quantity must be at least 1')
    .max(10000, 'Quantity cannot exceed 10,000'),
  unitPrice: z
    .number()
    .min(0, 'Unit price cannot be negative')
    .max(999999.99, 'Unit price exceeds maximum'),
  discount: z
    .number()
    .min(0, 'Discount cannot be negative')
    .max(100, 'Discount cannot exceed 100%')
    .optional()
    .default(0),
});

// ----- Address Schema -----
export const addressSchema = z.object({
  street: z
    .string()
    .min(1, 'Street address is required')
    .max(500, 'Street address must be at most 500 characters'),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must be at most 100 characters'),
  state: z
    .string()
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State must be at most 100 characters'),
  postalCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'Invalid postal code format (expected: 12345 or 12345-6789)'),
  country: z
    .string()
    .min(2, 'Country code is required')
    .max(100, 'Country name is too long')
    .default('United States'),
});

// ----- Order Create Schema -----
export const createOrderSchema = z.object({
  customerId: z
    .string()
    .uuid({ message: 'Customer ID must be a valid UUID' }),
  items: z
    .array(orderItemSchema)
    .min(1, 'At least one item is required')
    .max(100, 'Maximum 100 items per order'),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  notes: z
    .string()
    .max(1000, 'Notes must be at most 1000 characters')
    .optional()
    .default(''),
  priority: z
    .enum(['low', 'normal', 'high', 'urgent'], {
      errorMap: () => ({ message: 'Priority must be one of: low, normal, high, urgent' })
    })
    .default('normal'),
  tags: z
    .array(z.string().max(50, 'Tag must be at most 50 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
}).refine(
  (data) => data.billingAddress || true, // Billing optional, but if provided must be valid
  { message: 'Billing address is invalid', path: ['billingAddress'] }
);

// ----- Order Update Schema (Full Replace) -----
export const updateOrderSchema = createOrderSchema;

// ----- Order Patch Schema (Partial Update) -----
export const patchOrderSchema = z.object({
  customerId: z.string().uuid({ message: 'Customer ID must be a valid UUID' }).optional(),
  items: z.array(orderItemSchema).min(1).max(100).optional(),
  shippingAddress: addressSchema.optional(),
  billingAddress: addressSchema.optional(),
  notes: z.string().max(1000).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
}).refine(
  (data) => Object.values(data).some(v => v !== undefined),
  { message: 'At least one field must be provided for partial update' }
);

// ----- Order Status Update Schema -----
export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid status value' })
  }),
  reason: z.string().max(500).optional(),
  timestamp: z.string().datetime().optional(),
});

// ----- Order Query Schema -----
export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['createdAt', 'updatedAt', 'total', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

// ----- Order ID Param Schema -----
export const orderIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Order ID must be a valid UUID' }),
});

// ----- Order List Response Schema -----
export const orderListMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type OrderItem = z.infer<typeof orderItemSchema>;
export type Address = z.infer<typeof addressSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type PatchOrderInput = z.infer<typeof patchOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type OrderListMeta = z.infer<typeof orderListMetaSchema>;

// ============================================================================
// ORDER ENTITY
// ============================================================================

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address | null;
  notes: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Format Zod errors into a structured array
 */
function formatZodErrors(error: ZodError): Array<{ path: string; message: string; code: string }> {
  return error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Validate data against a schema and throw ValidationError on failure
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = formatZodErrors(result.error);
    const prefix = context ? `${context}: ` : '';
    throw new ValidationError(`${prefix}Validation failed`, errors);
  }
  
  return result.data;
}

/**
 * Validate data without throwing (returns result object)
 */
export function validateSafe<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Array<{ path: string; message: string; code: string }> } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      errors: formatZodErrors(result.error),
    };
  }
  
  return { success: true, data: result.data };
}

/**
 * Sanitize input data before validation
 */
export function sanitizeInput<T extends Record<string, unknown>>(data: T): T {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      sanitized[key] = sanitizeStringArray(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Partial<OrderListMeta>;
  requestId: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string; code: string }>;
    requestId: string;
    timestamp: string;
  };
}

export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  meta?: Partial<OrderListMeta>
): SuccessResponse<T> {
  return {
    success: true,
    data,
    meta,
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  details?: Array<{ path: string; message: string; code: string }>
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================================================
// REQUEST PARSERS
// ============================================================================

export interface ParsedRequest<T> {
  success: true;
  data: T;
}

export interface FailedRequest {
  success: false;
  response: Response;
}

/**
 * Parse and validate request body
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<ParsedRequest<T> | FailedRequest> {
  // Check content type
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return {
      success: false,
      response: Response.json(
        createErrorResponse('INVALID_CONTENT_TYPE', 'Content-Type must be application/json', ''),
        { status: 415 }
      ),
    };
  }

  // Check content length
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  if (contentLength > 1_000_000) {
    return {
      success: false,
      response: Response.json(
        createErrorResponse('PAYLOAD_TOO_LARGE', 'Request body exceeds 1MB limit', ''),
        { status: 413 }
      ),
    };
  }

  // Parse JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: Response.json(
        createErrorResponse('INVALID_JSON', 'Request body must be valid JSON', ''),
        { status: 400 }
      ),
    };
  }

  // Sanitize input
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    body = sanitizeInput(body as Record<string, unknown>);
  }

  // Validate
  const result = validateSafe(schema, body);
  
  if (!result.success) {
    return {
      success: false,
      response: Response.json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid request body', '', result.errors),
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate query parameters
 */
export function parseQuery<T>(
  url: URL,
  schema: ZodSchema<T>
): ParsedRequest<T> | FailedRequest {
  const queryObj: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    queryObj[key] = value;
  });

  const result = validateSafe(schema, queryObj);

  if (!result.success) {
    return {
      success: false,
      response: Response.json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid query parameters', '', result.errors),
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate path parameters
 */
export function parseParams<T>(
  params: Record<string, string>,
  schema: ZodSchema<T>
): ParsedRequest<T> | FailedRequest {
  const result = validateSafe(schema, params);

  if (!result.success) {
    return {
      success: false,
      response: Response.json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid path parameters', '', result.errors),
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

// ============================================================================
// ORDER SERVICE
// ============================================================================

class OrderService {
  private orders: Map<string, Order> = new Map();

  /**
   * Calculate order totals
   */
  private calculateTotals(items: OrderItem[]): { subtotal: number; discount: number; tax: number; total: number } {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = items.reduce((sum, item) => {
      if (item.discount && item.discount > 0) {
        return sum + (item.unitPrice * item.quantity * item.discount) / 100;
      }
      return sum;
    }, 0);
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * 0.08; // 8% tax
    const total = taxableAmount + tax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  /**
   * List orders with pagination and filtering
   */
  list(query: OrderQueryInput): { orders: Order[]; meta: OrderListMeta } {
    let filtered = Array.from(this.orders.values());

    // Apply filters
    if (query.status) {
      filtered = filtered.filter((o) => o.status === query.status);
    }
    if (query.customerId) {
      filtered = filtered.filter((o) => o.customerId === query.customerId);
    }
    if (query.search) {
      const search = query.search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(search) ||
          o.tags.some((t) => t.toLowerCase().includes(search))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[query.sort as keyof Order] as string | number;
      const bVal = b[query.sort as keyof Order] as string | number;
      const order = query.order === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * order;
      }
      return ((aVal as number) - (bVal as number)) * order;
    });

    // Paginate
    const total = filtered.length;
    const totalPages = Math.ceil(total / query.limit);
    const page = query.page;
    const startIndex = (page - 1) * query.limit;
    const paginatedOrders = filtered.slice(startIndex, startIndex + query.limit);

    const meta: OrderListMeta = {
      page,
      limit: query.limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return { orders: paginatedOrders, meta };
  }

  /**
   * Get a single order by ID
   */
  getById(id: string): Order | null {
    return this.orders.get(id) || null;
  }

  /**
   * Create a new order
   */
  create(input: CreateOrderInput): Order {
    const now = new Date().toISOString();
    const totals = this.calculateTotals(input.items);

    const order: Order = {
      id: uuidv4(),
      customerId: input.customerId,
      items: input.items,
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress ?? input.shippingAddress,
      notes: input.notes ?? '',
      priority: input.priority,
      tags: input.tags ?? [],
      status: 'pending',
      ...totals,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(order.id, order);
    return order;
  }

  /**
   * Update an order (full replacement)
   */
  update(id: string, input: UpdateOrderInput): Order | null {
    const existing = this.orders.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const totals = this.calculateTotals(input.items);

    const updated: Order = {
      ...existing,
      customerId: input.customerId,
      items: input.items,
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress ?? input.shippingAddress,
      notes: input.notes ?? '',
      priority: input.priority,
      tags: input.tags ?? [],
      ...totals,
      updatedAt: now,
    };

    this.orders.set(id, updated);
    return updated;
  }

  /**
   * Patch an order (partial update)
   */
  patch(id: string, input: PatchOrderInput): Order | null {
    const existing = this.orders.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const items = input.items ?? existing.items;
    const totals = this.calculateTotals(items);

    const updated: Order = {
      ...existing,
      ...(input.customerId !== undefined && { customerId: input.customerId }),
      ...(input.items !== undefined && { items }),
      ...(input.shippingAddress !== undefined && { shippingAddress: input.shippingAddress }),
      ...(input.billingAddress !== undefined && { billingAddress: input.billingAddress }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.status !== undefined && { status: input.status }),
      ...totals,
      updatedAt: now,
    };

    this.orders.set(id, updated);
    return updated;
  }

  /**
   * Update order status
   */
  updateStatus(id: string, input: UpdateOrderStatusInput): Order | null {
    const existing = this.orders.get(id);
    if (!existing) return null;

    const updated: Order = {
      ...existing,
      status: input.status,
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(id, updated);
    return updated;
  }

  /**
   * Delete an order
   */
  delete(id: string): boolean {
    return this.orders.delete(id);
  }

  /**
   * Clear all orders (for testing)
   */
  clear(): void {
    this.orders.clear();
  }

  /**
   * Get count (for testing)
   */
  get count(): number {
    return this.orders.size;
  }
}

// Export singleton instance
export const orderService = new OrderService();