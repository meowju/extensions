import { itemsStore } from './items.store.js';
import type {
  Item,
  CreateItemInput,
  UpdateItemInput,
  PatchItemInput,
  ListResponse,
  PaginationMeta,
} from '../types/index.js';

/**
 * Application errors
 */
export class NotFoundError extends Error {
  code = 'NOT_FOUND';
  statusCode = 404;
  
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  code = 'CONFLICT';
  statusCode = 409;
  
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
  details: unknown;
  
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Items Service - Business logic layer
 */
export class ItemsService {
  /**
   * List all items with pagination
   */
  list(page: number = 1, limit: number = 10): ListResponse<Item> {
    // Validate pagination parameters
    if (page < 1) {
      throw new ValidationError('Page must be >= 1');
    }
    if (!Number.isInteger(page)) {
      throw new ValidationError('Page must be an integer');
    }
    if (limit < 1) {
      throw new ValidationError('Limit must be >= 1');
    }
    if (!Number.isInteger(limit)) {
      throw new ValidationError('Limit must be an integer');
    }
    if (limit > 100) {
      throw new ValidationError('Limit must be <= 100');
    }

    const { items, total } = itemsStore.getPaginated(page, limit);
    const totalPages = Math.ceil(total / limit);
    
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
    };

    return { data: items, pagination };
  }

  /**
   * Get a single item by ID
   */
  getById(id: string): Item {
    const item = itemsStore.getById(id);
    if (!item) {
      throw new NotFoundError(`Item with id '${id}' not found`);
    }
    return item;
  }

  /**
   * Create a new item
   */
  create(input: CreateItemInput): Item {
    // Validate required fields - check existence before accessing properties
    if (input.name === undefined || input.name === null || input.name.toString().trim().length === 0) {
      throw new ValidationError('Name is required and cannot be empty');
    }
    if (input.name.trim().length > 100) {
      throw new ValidationError('Name must be at most 100 characters');
    }
    if (input.price === undefined || input.price === null || typeof input.price !== 'number' || isNaN(input.price)) {
      throw new ValidationError('Price is required and must be a number');
    }
    if (input.price < 0) {
      throw new ValidationError('Price must be >= 0');
    }
    if (input.quantity === undefined || input.quantity === null || typeof input.quantity !== 'number' || !Number.isInteger(input.quantity)) {
      throw new ValidationError('Quantity is required and must be an integer');
    }
    if (input.quantity < 0) {
      throw new ValidationError('Quantity must be >= 0');
    }
    if (input.description && input.description.length > 500) {
      throw new ValidationError('Description must be at most 500 characters');
    }
    if (input.tags && !Array.isArray(input.tags)) {
      throw new ValidationError('Tags must be an array');
    }
    if (input.tags && input.tags.some(t => typeof t !== 'string')) {
      throw new ValidationError('All tags must be strings');
    }

    // Check for duplicate name
    if (itemsStore.existsByName(input.name)) {
      throw new ConflictError(`Item with name '${input.name}' already exists`);
    }
    return itemsStore.create(input);
  }

  /**
   * Update an existing item
   */
  update(id: string, input: UpdateItemInput): Item {
    // Check item exists
    const existing = itemsStore.getById(id);
    if (!existing) {
      throw new NotFoundError(`Item with id '${id}' not found`);
    }

    // Check for duplicate name (excluding current item)
    if (itemsStore.existsByName(input.name, id)) {
      throw new ConflictError(`Item with name '${input.name}' already exists`);
    }

    const updated = itemsStore.update(id, input);
    if (!updated) {
      throw new NotFoundError(`Item with id '${id}' not found`);
    }
    return updated;
  }

  /**
   * Partially update an item
   */
  patch(id: string, input: PatchItemInput): Item {
    // Check item exists
    const existing = itemsStore.getById(id);
    if (!existing) {
      throw new NotFoundError(`Item with id '${id}' not found`);
    }

    // Check for duplicate name if name is being updated
    if (input.name && itemsStore.existsByName(input.name, id)) {
      throw new ConflictError(`Item with name '${input.name}' already exists`);
    }

    const updated = itemsStore.patch(id, input);
    if (!updated) {
      throw new NotFoundError(`Item with id '${id}' not found`);
    }
    return updated;
  }

  /**
   * Delete an item
   */
  delete(id: string): void {
    const deleted = itemsStore.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Item with id '${id}' not found`);
    }
  }
}

// Export singleton instance
export const itemsService = new ItemsService();
