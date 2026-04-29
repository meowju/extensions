import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validate, registerValidation, loginValidation } from '../middleware/validation.middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Public routes
router.post(
  '/register',
  validate(registerValidation),
  asyncHandler(async (req, res) => authController.register(req, res))
);

router.post(
  '/login',
  validate(loginValidation),
  asyncHandler(async (req, res) => authController.login(req, res))
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => authController.refresh(req, res))
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => authController.forgotPassword(req, res))
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => authController.resetPassword(req, res))
);

router.post(
  '/verify-email',
  asyncHandler(async (req, res) => authController.verifyEmail(req, res))
);

// Protected routes
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => authController.logout(req, res))
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => authController.me(req, res))
);

router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req, res) => authController.changePassword(req, res))
);

export default router;