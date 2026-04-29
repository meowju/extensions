import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UnauthorizedError, ForbiddenError } from '../types';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';

/**
 * Authentication middleware - verifies JWT access token
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const payload = authService.verifyToken(token);
    
    if (!payload || payload.type !== 'access') {
      throw new UnauthorizedError('Invalid or expired token');
    }
    
    // Check if token is revoked
    const revokedToken = await authService['prisma'].authToken.findFirst({
      where: { token, isRevoked: true },
    });
    
    if (revokedToken) {
      throw new UnauthorizedError('Token has been revoked');
    }
    
    // Get user
    const user = await userService.findById(payload.userId);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    
    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token present
 * Useful for routes that behave differently for authenticated users
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    const payload = authService.verifyToken(token);
    
    if (payload && payload.type === 'access') {
      const user = await userService.findById(payload.userId);
      
      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }
    }
    
    next();
  } catch {
    // Continue without authentication on error
    next();
  }
};

/**
 * Resource ownership middleware - check if user owns the resource
 */
export const ownsResource = (getResourceOwnerId: (req: AuthenticatedRequest) => Promise<string | null>) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }
      
      const ownerId = await getResourceOwnerId(req);
      
      if (!ownerId) {
        throw new ForbiddenError('Resource not found');
      }
      
      // Admin can access any resource
      if (req.user.role === 'ADMIN') {
        return next();
      }
      
      if (ownerId !== req.user.id) {
        throw new ForbiddenError('You do not own this resource');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};