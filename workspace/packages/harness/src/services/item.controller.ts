/**
 * Item Controller - HTTP Handlers for Item CRUD Endpoints
 * 
 * Handles all item-related HTTP requests with proper validation,
 * error handling, and response formatting.
 */

import type { Request, Response, NextFunction } from 'express';
import { itemService } from './item.service.js';
import { ItemCreateSchema, ItemUpdateSchema, ItemQuerySchema, ItemIdParamSchema } from '../../models/item.model.js';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

/**
 * Extended Request type with authenticated user
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Parse and validate request body
 */
function parseBody<T>(schema: typeof ItemCreateSchema | typeof ItemUpdateSchema, body: unknown) {
  return schema.safeParse(body);
}

/**
 * Parse and validate request params
 */
function parseParams(schema: typeof ItemIdParamSchema, params: unknown) {
  return schema.safeParse(params);
}

/**
 * Parse and validate query parameters
 */
function parseQuery(schema: typeof ItemQuerySchema, query: unknown) {
  return schema.safeParse(query);
}

/**
 * Item Controller - handles all item CRUD endpoints
 */
export class ItemController {
  /**
   * POST /items - Create a new item
   */
  async createItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      // Validate request body
      const validationResult = parseBody(ItemCreateSchema, req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: formatZodErrors(validationResult.error),
        });
        return;
      }

      // Create item
      const result = await itemService.createItem(userId, validationResult.data);

      if (!result.success || !result.item) {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to create item',
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: formatItemResponse(result.item),
        message: 'Item created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /items/:id - Get a single item by ID
   */
  async getItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      // Validate params
      const paramsValidation = parseParams(ItemIdParamSchema, req.params);
      if (!paramsValidation.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid item ID format',
          errors: formatZodErrors(paramsValidation.error),
        });
        return;
      }

      const itemId = paramsValidation.data.id;

      // Get item
      const result = await itemService.getItemById(itemId, userId);

      if (!result.success || !result.item) {
        res.status(404).json({
          success: false,
          message: result.error || 'Item not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: formatItemResponse(result.item),
        message: 'Item retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /items - List items with filtering, searching, and pagination
   */
  async listItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      // Validate query params
      const queryValidation = parseQuery(ItemQuerySchema, req.query);
      if (!queryValidation.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: formatZodErrors(queryValidation.error),
        });
        return;
      }

      const { page, limit, status, priority, search, sortBy, sortOrder } = queryValidation.data;

      // List items
      const result = await itemService.listItems(userId, {
        page,
        limit,
        status,
        priority,
        search,
        sortBy,
        sortOrder,
      });

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to list items',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          items: result.items.map(formatItemResponse),
          pagination: {
            page: result.page,
            limit,
            total: result.total,
            totalPages: result.totalPages,
            hasNext: result.page < result.totalPages,
            hasPrev: result.page > 1,
          },
        },
        message: `Retrieved ${result.items.length} items`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /items/:id - Update an item
   */
  async updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      // Validate params
      const paramsValidation = parseParams(ItemIdParamSchema, req.params);
      if (!paramsValidation.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid item ID format',
          errors: formatZodErrors(paramsValidation.error),
        });
        return;
      }

      // Validate body
      const bodyValidation = parseBody(ItemUpdateSchema, req.body);
      if (!bodyValidation.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: formatZodErrors(bodyValidation.error),
        });
        return;
      }

      const itemId = paramsValidation.data.id;

      // Update item
      const result = await itemService.updateItem(itemId, userId, bodyValidation.data);

      if (!result.success || !result.item) {
        const statusCode = result.error === 'Item not found' ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          message: result.error || 'Failed to update item',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: formatItemResponse(result.item),
        message: 'Item updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /items/:id - Delete an item (soft delete by default)
   */
  async deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      // Validate params
      const paramsValidation = parseParams(ItemIdParamSchema, req.params);
      if (!paramsValidation.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid item ID format',
          errors: formatZodErrors(paramsValidation.error),
        });
        return;
      }

      const itemId = paramsValidation.data.id;
      const hardDelete = req.query.hard === 'true';

      // Delete item
      const result = await itemService.deleteItem(itemId, userId, hardDelete);

      if (!result.success) {
        res.status(404).json({
          success: false,
          message: result.error || 'Failed to delete item',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: hardDelete ? 'Item permanently deleted' : 'Item deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /items/:id/restore - Restore a soft-deleted item
   */
  async restoreItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      // Validate params
      const paramsValidation = parseParams(ItemIdParamSchema, req.params);
      if (!paramsValidation.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid item ID format',
          errors: formatZodErrors(paramsValidation.error),
        });
        return;
      }

      const itemId = paramsValidation.data.id;

      // Restore item
      const result = await itemService.restoreItem(itemId, userId);

      if (!result.success || !result.item) {
        res.status(404).json({
          success: false,
          message: result.error || 'Failed to restore item',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: formatItemResponse(result.item),
        message: 'Item restored successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /items/stats - Get item statistics for the user
   */
  async getItemStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const result = await itemService.getItemStats(userId);

      if (!result.success || !result.stats) {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to get item statistics',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.stats,
        message: 'Item statistics retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /items/trash - List soft-deleted items
   */
  async listTrash(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const result = await itemService.listDeletedItems(userId, page, limit);

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to list deleted items',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          items: result.items.map(formatItemResponse),
          pagination: {
            page: result.page,
            limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
        message: `Retrieved ${result.items.length} deleted items`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /items/bulk-delete - Bulk delete items
   */
  async bulkDelete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { itemIds, hardDelete } = req.body;

      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'itemIds must be a non-empty array',
        });
        return;
      }

      if (itemIds.length > 100) {
        res.status(400).json({
          success: false,
          message: 'Maximum 100 items can be deleted at once',
        });
        return;
      }

      // Validate all IDs
      const invalidIds = itemIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid item IDs: ${invalidIds.join(', ')}`,
        });
        return;
      }

      const result = await itemService.bulkDelete(itemIds, userId, hardDelete === true);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to delete items',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { deletedCount: result.deletedCount },
        message: `${result.deletedCount} items deleted successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Format item document for API response
 */
function formatItemResponse(item: any): Record<string, unknown> {
  return {
    id: item._id?.toString() || item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    dueDate: item.dueDate,
    tags: item.tags,
    isDeleted: item.isDeleted,
    deletedAt: item.deletedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Format Zod errors for API response
 */
function formatZodErrors(error: ZodError): Array<{ field: string; message: string }> {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

// Export singleton instance
export const itemController = new ItemController();
export default itemController;