import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

/**
 * Example protected route
 * Demonstrates how to use the authenticate middleware
 */
export function createUserRouter(): Router {
  const router = Router();

  // GET /users/me - Get current user profile (protected)
  router.get('/me', authenticate, (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: req.user,
      message: 'User profile retrieved successfully',
    });
  });

  // PUT /users/me - Update current user profile (protected)
  router.put('/me', authenticate, (req: Request, res: Response) => {
    const { firstName, lastName } = req.body;

    // In a real app, you would call the user service to update
    if (req.user) {
      res.status(200).json({
        success: true,
        data: {
          ...req.user,
          firstName: firstName || req.user.firstName,
          lastName: lastName || req.user.lastName,
        },
        message: 'Profile updated successfully',
      });
    }
  });

  // DELETE /users/me - Delete current user account (protected)
  router.delete('/me', authenticate, (req: Request, res: Response) => {
    // In a real app, you would call the user service to delete
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  });

  return router;
}

export const userRouter = createUserRouter();