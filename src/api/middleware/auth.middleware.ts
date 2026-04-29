/**
 * Authentication Middleware
 * Express middleware for JWT verification and user authentication
 */

import type { Request, Response, NextFunction } from 'express';
import {
  type AuthenticatedUser,
  type AuthContext,
  AuthError,
  AuthErrorCode,
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
} from './auth.types.js';
import { jwtService } from './jwt.service.js';

// ============================================
// Token Extraction
// ============================================

/**
 * Extract JWT token from request
 * Checks Authorization header first, then cookies
 */
export function extractToken(req: Request): string | null {
  // Check Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookies as fallback
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}

// ============================================
// Core Authentication Middleware
// ============================================

/**
 * Authenticate user based on JWT token
 * Attaches user to req.user on success
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (!token) {
    const error = new AuthError(
      AuthErrorCode.TOKEN_MISSING,
      'Authentication token is required',
      401
    );
    req.authError = error;
    return next(error);
  }

  const payload = jwtService.verifyToken(token);

  if (!payload) {
    const error = new AuthError(
      AuthErrorCode.TOKEN_INVALID,
      'Invalid or expired token',
      401
    );
    req.authError = error;
    return next(error);
  }

  // Build authenticated user from token payload
  const user: AuthenticatedUser = {
    id: payload.sub,
    email: payload.email,
    name: '', // Not stored in token, fetch if needed
    role: payload.role,
    createdAt: '', // Not stored in token
  };

  req.user = user;
  next();
}

// ============================================
// Optional Authentication Middleware
// ============================================

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that behave differently for auth/unauth users
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (!token) {
    // No token, continue without user
    next();
    return;
  }

  const payload = jwtService.verifyToken(token);

  if (!payload) {
    // Invalid token, continue without user
    next();
    return;
  }

  const user: AuthenticatedUser = {
    id: payload.sub,
    email: payload.email,
    name: '',
    role: payload.role,
    createdAt: '',
  };

  req.user = user;
  next();
}

// ============================================
// Role-Based Access Control
// ============================================

/**
 * Require specific roles to access a route
 * @param allowedRoles - Array of roles allowed to access
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Check authentication first
    if (!req.user) {
      const error = new AuthError(
        AuthErrorCode.TOKEN_MISSING,
        'Authentication required',
        401
      );
      req.authError = error;
      return next(error);
    }

    // Check if user has one of the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      const error = new AuthError(
        AuthErrorCode.INSUFFICIENT_ROLE,
        `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        403
      );
      req.authError = error;
      return next(error);
    }

    next();
  };
}

/**
 * Require minimum role level to access a route
 * Higher role = more privileges
 * @param minimumRole - Minimum role required
 */
export function requireMinRole(minimumRole: UserRole) {
  const roleHierarchy: UserRole[] = [
    UserRole.USER,
    UserRole.EDITOR,
    UserRole.MODERATOR,
    UserRole.ADMIN,
  ];

  const minimumIndex = roleHierarchy.indexOf(minimumRole);

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error = new AuthError(
        AuthErrorCode.TOKEN_MISSING,
        'Authentication required',
        401
      );
      req.authError = error;
      return next(error);
    }

    const userIndex = roleHierarchy.indexOf(req.user.role);

    if (userIndex < minimumIndex) {
      const error = new AuthError(
        AuthErrorCode.INSUFFICIENT_ROLE,
        `Access denied. Minimum required role: ${minimumRole}`,
        403
      );
      req.authError = error;
      return next(error);
    }

    next();
  };
}

// ============================================
// Permission-Based Access Control
// ============================================

/**
 * Require specific permissions to access a route
 * @param requiredPermissions - Array of permissions required
 */
export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Check authentication first
    if (!req.user) {
      const error = new AuthError(
        AuthErrorCode.TOKEN_MISSING,
        'Authentication required',
        401
      );
      req.authError = error;
      return next(error);
    }

    // Get user's permissions
    const userPermissions = ROLE_PERMISSIONS[req.user.role];

    // Check if user has admin:all permission (grants everything)
    if (userPermissions.includes(Permission.ADMIN_ALL)) {
      next();
      return;
    }

    // Check all required permissions
    const hasAllPermissions = requiredPermissions.every(perm =>
      userPermissions.includes(perm)
    );

    if (!hasAllPermissions) {
      const error = new AuthError(
        AuthErrorCode.INSUFFICIENT_PERMISSIONS,
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
        403
      );
      req.authError = error;
      return next(error);
    }

    next();
  };
}

/**
 * Require any of the specified permissions
 * @param permissions - Array of permissions (user needs at least one)
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error = new AuthError(
        AuthErrorCode.TOKEN_MISSING,
        'Authentication required',
        401
      );
      req.authError = error;
      return next(error);
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role];

    if (userPermissions.includes(Permission.ADMIN_ALL)) {
      next();
      return;
    }

    const hasAnyPermission = permissions.some(perm =>
      userPermissions.includes(perm)
    );

    if (!hasAnyPermission) {
      const error = new AuthError(
        AuthErrorCode.INSUFFICIENT_PERMISSIONS,
        `Access denied. At least one of these permissions required: ${permissions.join(', ')}`,
        403
      );
      req.authError = error;
      return next(error);
    }

    next();
  };
}

// ============================================
// Owner-Based Access Control
// ============================================

/**
 * Require user to be owner of a resource or have elevated permissions
 * @param getOwnerId - Function to extract owner ID from request/params
 */
export function requireOwnerOrPermission(
  getOwnerId: (req: Request) => string | null,
  permission: Permission
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error = new AuthError(
        AuthErrorCode.TOKEN_MISSING,
        'Authentication required',
        401
      );
      req.authError = error;
      return next(error);
    }

    // Check if user owns the resource
    const ownerId = getOwnerId(req);
    if (ownerId && ownerId === req.user.id) {
      next();
      return;
    }

    // Check if user has the required permission
    const userPermissions = ROLE_PERMISSIONS[req.user.role];
    if (
      userPermissions.includes(Permission.ADMIN_ALL) ||
      userPermissions.includes(permission)
    ) {
      next();
      return;
    }

    const error = new AuthError(
      AuthErrorCode.INSUFFICIENT_PERMISSIONS,
      'Access denied. You must be the owner or have elevated permissions.',
      403
    );
    req.authError = error;
    return next(error);
  };
}

// ============================================
// Auth Context Builder
// ============================================

/**
 * Build auth context for use in route handlers
 * Combines authentication and authorization checks
 */
export async function buildAuthContext(req: Request): Promise<AuthContext> {
  const token = extractToken(req);

  if (!token) {
    return {
      user: null,
      tokenValid: false,
      error: new AuthError(
        AuthErrorCode.TOKEN_MISSING,
        'Authentication token is required',
        401
      ),
    };
  }

  const payload = jwtService.verifyToken(token);

  if (!payload) {
    return {
      user: null,
      tokenValid: false,
      error: new AuthError(
        AuthErrorCode.TOKEN_INVALID,
        'Invalid or expired token',
        401
      ),
    };
  }

  return {
    user: {
      id: payload.sub,
      email: payload.email,
      name: '',
      role: payload.role,
      createdAt: '',
    },
    tokenValid: true,
  };
}

// ============================================
// Combined Auth Middleware Factory
// ============================================

/**
 * Create a middleware with multiple auth requirements
 * @param options - Configuration options
 */
export interface AuthMiddlewareOptions {
  /** Require authentication (default: true) */
  authentication?: boolean;
  /** Required roles (if any) */
  roles?: UserRole[];
  /** Minimum role level */
  minRole?: UserRole;
  /** Required permissions */
  permissions?: Permission[];
  /** Any of these permissions (at least one required) */
  anyPermission?: Permission[];
  /** Owner check function */
  ownerCheck?: (req: Request) => string | null;
  /** Permission for owner bypass */
  ownerBypassPermission?: Permission;
}

export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const {
    authentication = true,
    roles,
    minRole,
    permissions,
    anyPermission,
    ownerCheck,
    ownerBypassPermission,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Handle authentication requirement
    if (authentication) {
      const token = extractToken(req);

      if (!token) {
        const error = new AuthError(
          AuthErrorCode.TOKEN_MISSING,
          'Authentication token is required',
          401
        );
        req.authError = error;
        return next(error);
      }

      const payload = jwtService.verifyToken(token);

      if (!payload) {
        const error = new AuthError(
          AuthErrorCode.TOKEN_INVALID,
          'Invalid or expired token',
          401
        );
        req.authError = error;
        return next(error);
      }

      req.user = {
        id: payload.sub,
        email: payload.email,
        name: '',
        role: payload.role,
        createdAt: '',
      };
    }

    // Skip further checks if no user (optional auth case)
    if (!req.user) {
      next();
      return;
    }

    // Check roles
    if (roles && roles.length > 0) {
      if (!roles.includes(req.user.role)) {
        const error = new AuthError(
          AuthErrorCode.INSUFFICIENT_ROLE,
          `Access denied. Required roles: ${roles.join(', ')}`,
          403
        );
        req.authError = error;
        return next(error);
      }
    }

    // Check minimum role
    if (minRole) {
      const roleHierarchy: UserRole[] = [
        UserRole.USER,
        UserRole.EDITOR,
        UserRole.MODERATOR,
        UserRole.ADMIN,
      ];
      const minimumIndex = roleHierarchy.indexOf(minRole);
      const userIndex = roleHierarchy.indexOf(req.user.role);

      if (userIndex < minimumIndex) {
        const error = new AuthError(
          AuthErrorCode.INSUFFICIENT_ROLE,
          `Access denied. Minimum required role: ${minRole}`,
          403
        );
        req.authError = error;
        return next(error);
      }
    }

    // Check permissions
    if (permissions && permissions.length > 0) {
      const userPermissions = ROLE_PERMISSIONS[req.user.role];

      if (
        !userPermissions.includes(Permission.ADMIN_ALL) &&
        !permissions.every(perm => userPermissions.includes(perm))
      ) {
        const error = new AuthError(
          AuthErrorCode.INSUFFICIENT_PERMISSIONS,
          `Access denied. Required permissions: ${permissions.join(', ')}`,
          403
        );
        req.authError = error;
        return next(error);
      }
    }

    // Check any permission
    if (anyPermission && anyPermission.length > 0) {
      const userPermissions = ROLE_PERMISSIONS[req.user.role];

      if (
        !userPermissions.includes(Permission.ADMIN_ALL) &&
        !anyPermission.some(perm => userPermissions.includes(perm))
      ) {
        const error = new AuthError(
          AuthErrorCode.INSUFFICIENT_PERMISSIONS,
          `Access denied. At least one of these permissions required: ${anyPermission.join(', ')}`,
          403
        );
        req.authError = error;
        return next(error);
      }
    }

    // Check ownership
    if (ownerCheck && ownerBypassPermission) {
      const ownerId = ownerCheck(req);
      const userPermissions = ROLE_PERMISSIONS[req.user.role];

      if (
        ownerId !== req.user.id &&
        !userPermissions.includes(Permission.ADMIN_ALL) &&
        !userPermissions.includes(ownerBypassPermission)
      ) {
        const error = new AuthError(
          AuthErrorCode.INSUFFICIENT_PERMISSIONS,
          'Access denied. You must be the owner or have elevated permissions.',
          403
        );
        req.authError = error;
        return next(error);
      }
    }

    next();
  };
}

// Export auth context type
export type { AuthContext } from './auth.types.js';