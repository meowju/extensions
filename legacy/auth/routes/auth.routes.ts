import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';

/**
 * Auth Routes - Authentication API endpoints
 */
export function createAuthRouter(): Router {
  const router = Router();

  // POST /auth/register - Create new user account
  router.post('/register', (req, res, next) =>
    authController.register(req, res, next)
  );

  // POST /auth/login - Authenticate user
  router.post('/login', (req, res, next) =>
    authController.login(req, res, next)
  );

  // POST /auth/refresh - Refresh access token
  router.post('/refresh', (req, res, next) =>
    authController.refresh(req, res, next)
  );

  // POST /auth/logout - Logout current session
  router.post('/logout', (req, res, next) =>
    authController.logout(req, res, next)
  );

  // POST /auth/logout-all - Logout all sessions
  router.post('/logout-all', (req, res, next) =>
    authController.logoutAll(req, res, next)
  );

  return router;
}

export const authRouter = createAuthRouter();