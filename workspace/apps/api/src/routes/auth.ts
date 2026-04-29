import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, schemas } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Apply rate limiting to auth routes
router.use(authRateLimiter.middleware());

// POST /api/auth/register
router.post(
  '/register',
  validateBody(schemas.register),
  (req, res, next) => authController.register(req, res, next)
);

// POST /api/auth/login
router.post(
  '/login',
  validateBody(schemas.login),
  (req, res, next) => authController.login(req, res, next)
);

// POST /api/auth/logout
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// GET /api/auth/me - Protected route
router.get(
  '/me',
  authenticate,
  (req, res, next) => authController.me(req, res, next)
);

export default router;
