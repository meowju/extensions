import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { 
  validate, 
  updateUserValidation, 
  idParamValidation,
  userQueryValidation 
} from '../middleware/validation.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Get current user's profile
router.get(
  '/me',
  asyncHandler(async (req, res) => userController.getMe(req, res))
);

// Update current user's profile
router.patch(
  '/me',
  validate(updateUserValidation),
  asyncHandler(async (req, res) => userController.updateMe(req, res))
);

// Admin only routes
router.get(
  '/',
  authorize('ADMIN'),
  validate(userQueryValidation),
  asyncHandler(async (req, res) => userController.getAll(req, res))
);

router.get(
  '/:id',
  authorize('ADMIN'),
  validate(idParamValidation),
  asyncHandler(async (req, res) => userController.getById(req, res))
);

router.patch(
  '/:id',
  authorize('ADMIN'),
  validate([...idParamValidation, ...updateUserValidation]),
  asyncHandler(async (req, res) => userController.update(req, res))
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  validate(idParamValidation),
  asyncHandler(async (req, res) => userController.deactivate(req, res))
);

router.post(
  '/:id/activate',
  authorize('ADMIN'),
  validate(idParamValidation),
  asyncHandler(async (req, res) => userController.activate(req, res))
);

router.patch(
  '/:id/role',
  authorize('ADMIN'),
  validate([
    ...idParamValidation,
  ]),
  asyncHandler(async (req, res) => userController.updateRole(req, res))
);

export default router;