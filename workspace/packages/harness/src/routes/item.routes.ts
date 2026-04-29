/**
 * Item Routes - CRUD API Endpoints for Items
 * 
 * All routes are protected with authentication middleware.
 * Implements proper CRUD operations with validation and error handling.
 */

import { Router, Request, Response } from 'express';
import { itemController } from '../services/item.controller.js';
import { authenticate } from '../auth/middleware/auth.middleware.js';

/**
 * Create the items router with all CRUD endpoints
 */
export function createItemRouter(): Router {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(authenticate);

  // POST /items - Create a new item
  router.post('/', (req: Request, res: Response, next) =>
    itemController.createItem(req, res, next)
  );

  // GET /items - List items with filtering, searching, and pagination
  router.get('/', (req: Request, res: Response, next) =>
    itemController.listItems(req, res, next)
  );

  // GET /items/stats - Get item statistics
  router.get('/stats', (req: Request, res: Response, next) =>
    itemController.getItemStats(req, res, next)
  );

  // GET /items/trash - List soft-deleted items
  router.get('/trash', (req: Request, res: Response, next) =>
    itemController.listTrash(req, res, next)
  );

  // GET /items/:id - Get a single item by ID
  router.get('/:id', (req: Request, res: Response, next) =>
    itemController.getItem(req, res, next)
  );

  // PUT /items/:id - Update an item
  router.put('/:id', (req: Request, res: Response, next) =>
    itemController.updateItem(req, res, next)
  );

  // DELETE /items/:id - Delete an item (soft delete by default)
  router.delete('/:id', (req: Request, res: Response, next) =>
    itemController.deleteItem(req, res, next)
  );

  // POST /items/:id/restore - Restore a soft-deleted item
  router.post('/:id/restore', (req: Request, res: Response, next) =>
    itemController.restoreItem(req, res, next)
  );

  // POST /items/bulk-delete - Bulk delete items
  router.post('/bulk-delete', (req: Request, res: Response, next) =>
    itemController.bulkDelete(req, res, next)
  );

  return router;
}

// Export router for use in server configuration
export const itemRouter = createItemRouter();