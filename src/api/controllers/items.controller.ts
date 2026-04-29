/**
 * Items Controller
 * 
 * REST API endpoint implementation with comprehensive input validation,
 * request parsing, schema validation, and standardized error responses.
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
  createItemSchema,
  updateItemSchema,
  patchItemSchema,
  paginationSchema,
  idParamSchema,
  CreateItemInput,
  UpdateItemInput,
  PatchItemInput,
  PaginationQuery,
  IdParam,
} from '../schemas/items.schema.js';
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
 * Item entity (persisted data)
 */
interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// IN-MEMORY STORAGE (for demo purposes)
// ============================================================================

const items: Map<string, Item> = new Map();

// ============================================================================
// REQUEST PARSING
// ============================================================================

/**
 * Parse and validate request body
 */
function parseBody<T>(body: unknown, schema: typeof createItemSchema | typeof updateItemSchema | typeof patchItemSchema): {
  success: true;
  data: T;
} | {
  success: false;
  response: Response;
} {
  const result = schema.safeParse(body);
  
  if (!result.success) {
    const details: Record<string, string[]> = {};
    // Zod v4 uses `issues` instead of `errors`
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
function parseQuery(query: URLSearchParams): {
  success: true;
  data: PaginationQuery;
} | {
  success: false;
  response: Response;
} {
  const queryObj: Record<string, string> = {};
  query.forEach((value, key) => {
    queryObj[key] = value;
  });
  
  const result = paginationSchema.safeParse(queryObj);
  
  if (!result.success) {
    const details: Record<string, string[]> = {};
    // Zod v4 uses `issues` instead of `errors`
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
function parseParams(params: Record<string, string>): {
  success: true;
  data: IdParam;
} | {
  success: false;
  response: Response;
} {
  const result = idParamSchema.safeParse(params);
  
  if (!result.success) {
    const details: Record<string, string[]> = {};
    // Zod v4 uses `issues` instead of `errors`
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

// ============================================================================
// HTTP METHODS
// ============================================================================

/**
 * GET /items - List all items with pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * 
 * Returns:
 * - 200: List of items with pagination metadata
 * - 400: Invalid query parameters
 */
export async function listItems(request: Request): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') ?? `req_${Date.now().toString(36)}`;
  
  // Parse and validate query parameters
  const queryResult = parseQuery(new URL(request.url).searchParams);
  if (!queryResult.success) {
    const errorResponse = queryResult.response as Response;
    const body = await errorResponse.json();
    body.error.requestId = requestId;
    return Response.json(body, {
      status: errorResponse.status,
      headers: errorResponse.headers,
    });
  }
  
  const { page, limit } = queryResult.data;
  
  // Get all items and apply pagination
  const allItems = Array.from(items.values());
  const total = allItems.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedItems = allItems.slice(startIndex, startIndex + limit);
  
  const response: ApiSuccess<Item[]> = {
    success: true,
    data: paginatedItems,
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
 * GET /items/:id - Get a single item by ID
 * 
 * Path Parameters:
 * - id: Item UUID
 * 
 * Returns:
 * - 200: Item details
 * - 400: Invalid ID format
 * - 404: Item not found
 */
export async function getItem(request: Request, params: Record<string, string>): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') ?? `req_${Date.now().toString(36)}`;
  
  // Parse and validate path parameters
  const paramsResult = parseParams(params);
  if (!paramsResult.success) {
    const errorResponse = paramsResult.response as Response;
    const body = await errorResponse.json();
    body.error.requestId = requestId;
    return Response.json(body, {
      status: errorResponse.status,
      headers: errorResponse.headers,
    });
  }
  
  const { id } = paramsResult.data;
  
  // Find item
  const item = items.get(id);
  
  if (!item) {
    return Response.json(
      {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `Item with ID '${id}' not found`,
          requestId,
        },
      } as ApiError,
      {
        status: StatusCode.NOT_FOUND,
        headers: { 'Content-Type': ContentType.JSON },
      }
    );
  }
  
  const response: ApiSuccess<Item> = {
    success: true,
    data: item,
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
 * POST /items - Create a new item
 * 
 * Request Body:
 * - name: Item name (required, 1-100 chars)
 * - description: Item description (optional, max 500 chars)
 * - price: Item price (required, >= 0)
 * - quantity: Item quantity (required, >= 0, integer)
 * - tags: Item tags (optional, array of strings)
 * 
 * Returns:
 * - 201: Created item
 * - 400: Validation error
 */
export async function createItem(request: Request): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') ?? `req_${Date.now().toString(36)}`;
  
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
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
  const bodyResult = parseBody<CreateItemInput>(body, createItemSchema);
  if (!bodyResult.success) {
    const errorResponse = bodyResult.response as Response;
    const body = await errorResponse.json();
    body.error.requestId = requestId;
    return Response.json(body, {
      status: errorResponse.status,
      headers: errorResponse.headers,
    });
  }
  
  // Create item
  const now = new Date().toISOString();
  const newItem: Item = {
    id: uuidv4(),
    name: bodyResult.data.name,
    description: bodyResult.data.description ?? '',
    price: bodyResult.data.price,
    quantity: bodyResult.data.quantity,
    tags: bodyResult.data.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
  
  items.set(newItem.id, newItem);
  
  const response: ApiSuccess<Item> = {
    success: true,
    data: newItem,
    requestId,
  };
  
  return Response.json(response, {
    status: StatusCode.CREATED,
    headers: {
      'Content-Type': ContentType.JSON,
      'X-Request-ID': requestId,
      Location: `/items/${newItem.id}`,
    },
  });
}

/**
 * PUT /items/:id - Replace an item
 * 
 * Path Parameters:
 * - id: Item UUID
 * 
 * Request Body: Same as POST /items
 * 
 * Returns:
 * - 200: Updated item
 * - 400: Validation error
 * - 404: Item not found
 */
export async function updateItem(request: Request, params: Record<string, string>): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') ?? `req_${Date.now().toString(36)}`;
  
  // Parse and validate path parameters
  const paramsResult = parseParams(params);
  if (!paramsResult.success) {
    const errorResponse = paramsResult.response as Response;
    const body = await errorResponse.json();
    body.error.requestId = requestId;
    return Response.json(body, {
      status: errorResponse.status,
      headers: errorResponse.headers,
    });
  }
  
  const { id } = paramsResult.data;
  
  // Check if item exists
  if (!items.has(id)) {
    return Response.json(
      {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `Item with ID '${id}' not found`,
          requestId,
        },
      } as ApiError,
      {
        status: StatusCode.NOT_FOUND,
        headers: { 'Content-Type': ContentType.JSON },
      }
    );
  }
  
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
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
  const bodyResult = parseBody<UpdateItemInput>(body, updateItemSchema);
  if (!bodyResult.success) {
    const errorResponse = bodyResult.response as Response;
    const body = await errorResponse.json();
    body.error.requestId = requestId;
    return Response.json(body, {
      status: errorResponse.status,
      headers: errorResponse.headers,
    });
  }
  
  // Update item
  const existing = items.get(id)!;
  const now = new Date().toISOString();
  const updatedItem: Item = {
    id: existing.id,
    name: bodyResult.data.name,
    description: bodyResult.data.description ?? '',
    price: bodyResult.data.price,
    quantity: bodyResult.data.quantity,
    tags: bodyResult.data.tags ?? [],
    createdAt: existing.createdAt,
    updatedAt: now,
  };
  
  items.set(id, updatedItem);
  
  const response: ApiSuccess<Item> = {
    success: true,
    data: updatedItem,
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
 * PATCH /items/:id - Partially update an item
 * 
 * Path Parameters:
 * - id: Item UUID
 * 
 * Request Body:
 * - Any combination of: name, description, price, quantity, tags
 * - At least one field required
 * 
 * Returns:
 * - 200: Updated item
 * - 400: Validation error
 * - 404: Item not found
 */
export async function patchItem(request: Request, params: Record<string, string>): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') ?? `req_${Date.now().toString(36)}`;
  
  // Parse and validate path parameters
  const paramsResult = parseParams(params);
  if (!paramsResult.success) {
    const errorResponse = paramsResult.response as Response;
    const body = await errorResponse.json();
    body.error.requestId = requestId;
    return Response.json(body, {
      status: errorResponse.status,
      headers: errorResponse.headers,
    });
  }
  
  const { id } = paramsResult.data;
  
  // Check if item exists
  if (!items.has(id)) {
    return Response.json(
      {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `Item with ID '${id}' not found`,
          requestId,
        },
      } as ApiError,
      {
        status: StatusCode.NOT_FOUND,
        headers: { 'Content-Type': ContentType.JSON },
      }
    );
  }
  
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
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
  const bodyResult = parseBody<PatchItemInput>(body, patchItemSchema);
  if (!bodyResult.success) {
    const errorResponse = bodyResult.response as Response;
    const body = await errorResponse.json();
    body.error.requestId = requestId;
    return Response.json(body, {
      status: errorResponse.status,
      headers: errorResponse.headers,
    });
  }
  
  // Update item (merge with existing)
  const existing = items.get(id)!;
  const now = new Date().toISOString();
  const updatedItem: Item = {
    id: existing.id,
    name: bodyResult.data.name ?? existing.name,
    description: bodyResult.data.description ?? existing.description,
    price: bodyResult.data.price ?? existing.price,
    quantity: bodyResult.data.quantity ?? existing.quantity,
    tags: bodyResult.data.tags ?? existing.tags,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
  
  items.set(id, updatedItem);
  
  const response: ApiSuccess<Item> = {
    success: true,
    data: updatedItem,
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
 * DELETE /items/:id - Delete an item
 * 
 * Path Parameters:
 * - id: Item UUID
 * 
 * Returns:
 * - 204: Item deleted
 * - 400: Invalid ID format
 * - 404: Item not found
 */
export async function deleteItem(request: Request, params: Record<string, string>): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') ?? `req_${Date.now().toString(36)}`;
  
  // Parse and validate path parameters
  const paramsResult = parseParams(params);
  if (!paramsResult.success) {
    const errorResponse = paramsResult.response as Response;
    const body = await errorResponse.json();
    body.error.requestId = requestId;
    return Response.json(body, {
      status: errorResponse.status,
      headers: errorResponse.headers,
    });
  }
  
  const { id } = paramsResult.data;
  
  // Check if item exists
  if (!items.has(id)) {
    return Response.json(
      {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `Item with ID '${id}' not found`,
          requestId,
        },
      } as ApiError,
      {
        status: StatusCode.NOT_FOUND,
        headers: { 'Content-Type': ContentType.JSON },
      }
    );
  }
  
  // Delete item
  items.delete(id);
  
  return new Response(null, {
    status: StatusCode.NO_CONTENT,
    headers: {
      'X-Request-ID': requestId,
    },
  });
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Clear all items (for testing)
 */
export function clearItems(): void {
  items.clear();
}

/**
 * Get item count (for testing)
 */
export function getItemCount(): number {
  return items.size;
}