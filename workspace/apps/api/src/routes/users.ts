import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validateBody, validateParams, schemas } from '../middleware/validate.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/users - List all users (admin only)
router.get(
  '/',
  requireAdmin,
  (req, res, next) => userController.list(req, res, next)
);

// GET /api/users/:id - Get user by ID
router.get(
  '/:id',
  validateParams(schemas.idParam),
  (req, res, next) => userController.getById(req, res, next)
);

// PUT /api/users/:id - Update user
router.put(
  '/:id',
  validateParams(schemas.idParam),
  validateBody(schemas.updateUser),
  (req, res, next) => userController.update(req, res, next)
);

// DELETE /api/users/:id - Delete user (admin only)
router.delete(
  '/:id',
  validateParams(schemas.idParam),
  requireAdmin,
  (req, res, next) => userController.delete(req, res, next)
);

export default router;
