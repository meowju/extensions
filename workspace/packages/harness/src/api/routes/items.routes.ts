import { Router } from 'express';
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  patchItem,
  deleteItem,
} from '../controllers/items.controller.js';

const router = Router();

// List all items (GET /items)
router.get('/', listItems);

// Get single item (GET /items/:id)
router.get('/:id', getItem);

// Create item (POST /items)
router.post('/', createItem);

// Update item (PUT /items/:id)
router.put('/:id', updateItem);

// Partial update (PATCH /items/:id)
router.patch('/:id', patchItem);

// Delete item (DELETE /items/:id)
router.delete('/:id', deleteItem);

export { router as itemsRouter };
