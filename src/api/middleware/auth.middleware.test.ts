/**
 * Auth Middleware Tests
 * Tests for authentication, authorization, and RBAC middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  extractToken,
  authenticate,
  optionalAuth,
  requireRole,
  requireMinRole,
  requirePermission,
  requireAnyPermission,
  createAuthMiddleware,
  AuthError,
  AuthErrorCode,
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
} from './auth.middleware.js';
import { JwtService } from './jwt.service.js';

// ============================================
// Mock Helpers
// ============================================

function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    headers: {},
    user: undefined,
    authError: undefined,
    ...overrides,
  };
}

function createMockResponse(): Partial<Response> & { body: any; statusCode: number } {
  return {
    body: undefined,
    statusCode: 200,
    status: function(this: any, code: number) {
      this.statusCode = code;
      return this;
    },
    json: function(this: any, data: any) {
      this.body = data;
      return this;
    },
  } as any;
}

function createMockNext(): NextFunction {
  return vi.fn();
}

// ============================================
// Test Data
// ============================================

const TEST_SECRET = 'test-secret-key-for-testing-purposes-only';
const TEST_USER = {
  id: 'user-123',
  email: 'test@example.com',
  role: UserRole.USER,
};

const ADMIN_USER = {
  id: 'admin-456',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
};

let jwtService: JwtService;

beforeEach(() => {
  jwtService = new JwtService({
    secret: TEST_SECRET,
    expiresIn: '15m',
    refreshExpiresIn: '7d',
    issuer: 'test',
    audience: 'test',
  });
});

// ============================================
// Token Extraction Tests
// ============================================

describe('Token Extraction', () => {
  it('should extract token from Authorization header', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer abc123token' },
    });

    const token = extractToken(req as Request);
    expect(token).toBe('abc123token');
  });

  it('should extract token from cookie', () => {
    const req = createMockRequest({
      cookies: { accessToken: 'cookie-token-123' },
    });

    const token = extractToken(req as Request);
    expect(token).toBe('cookie-token-123');
  });

  it('should prefer Authorization header over cookie', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer header-token' },
      cookies: { accessToken: 'cookie-token' },
    });

    const token = extractToken(req as Request);
    expect(token).toBe('header-token');
  });

  it('should return null when no token present', () => {
    const req = createMockRequest();
    const token = extractToken(req as Request);
    expect(token).toBeNull();
  });
});

// ============================================
// Authentication Middleware Tests
// ============================================

describe('Authentication Middleware', () => {
  it('should authenticate valid token', () => {
    const token = jwtService.generateToken({
      sub: TEST_USER.id,
      email: TEST_USER.email,
      role: TEST_USER.role,
    });

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = createMockNext();

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user?.id).toBe(TEST_USER.id);
    expect(req.user?.email).toBe(TEST_USER.email);
    expect(req.user?.role).toBe(TEST_USER.role);
  });

  it('should reject request without token', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.authError).toBeDefined();
    expect(req.authError?.code).toBe(AuthErrorCode.TOKEN_MISSING);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid token', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer invalid-token' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.authError?.code).toBe(AuthErrorCode.TOKEN_INVALID);
    expect(res.statusCode).toBe(401);
  });

  it('should reject malformed Authorization header', () => {
    const req = createMockRequest({
      headers: { authorization: 'InvalidFormat token' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});

// ============================================
// Optional Auth Middleware Tests
// ============================================

describe('Optional Authentication', () => {
  it('should continue without user when no token', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    optionalAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('should attach user when valid token present', () => {
    const token = jwtService.generateToken({
      sub: TEST_USER.id,
      email: TEST_USER.email,
      role: TEST_USER.role,
    });

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = createMockNext();

    optionalAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user?.id).toBe(TEST_USER.id);
  });

  it('should continue without user when token invalid', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer invalid-token' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    optionalAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });
});

// ============================================
// Role-Based Access Control Tests
// ============================================

describe('Role-Based Access Control', () => {
  describe('requireRole', () => {
    it('should allow user with matching role', () => {
      const req = createMockRequest({ user: { ...TEST_USER } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole(UserRole.USER);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.authError).toBeUndefined();
    });

    it('should deny user without matching role', () => {
      const req = createMockRequest({ user: { ...TEST_USER } }); // USER role
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole(UserRole.ADMIN);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.authError).toBeDefined();
      expect(req.authError?.code).toBe(AuthErrorCode.INSUFFICIENT_ROLE);
      expect(res.statusCode).toBe(403);
    });

    it('should deny unauthenticated request', () => {
      const req = createMockRequest(); // No user
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole(UserRole.USER);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.authError?.code).toBe(AuthErrorCode.TOKEN_MISSING);
      expect(res.statusCode).toBe(401);
    });

    it('should allow if user has any of the specified roles', () => {
      const req = createMockRequest({
        user: { ...TEST_USER, role: UserRole.MODERATOR },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole(UserRole.ADMIN, UserRole.MODERATOR);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireMinRole', () => {
    it('should allow user with equal role', () => {
      const req = createMockRequest({ user: { ...TEST_USER, role: UserRole.EDITOR } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireMinRole(UserRole.EDITOR);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow user with higher role', () => {
      const req = createMockRequest({ user: { ...ADMIN_USER } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireMinRole(UserRole.EDITOR);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny user with lower role', () => {
      const req = createMockRequest({ user: { ...TEST_USER, role: UserRole.USER } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireMinRole(UserRole.EDITOR);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.authError?.code).toBe(AuthErrorCode.INSUFFICIENT_ROLE);
      expect(res.statusCode).toBe(403);
    });
  });
});

// ============================================
// Permission-Based Access Control Tests
// ============================================

describe('Permission-Based Access Control', () => {
  describe('requirePermission', () => {
    it('should allow user with required permission', () => {
      const req = createMockRequest({
        user: { ...TEST_USER, role: UserRole.EDITOR },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requirePermission(Permission.ITEMS_CREATE);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny user without required permission', () => {
      const req = createMockRequest({ user: { ...TEST_USER } }); // USER role
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requirePermission(Permission.ITEMS_CREATE);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.authError?.code).toBe(AuthErrorCode.INSUFFICIENT_PERMISSIONS);
      expect(res.statusCode).toBe(403);
    });

    it('should grant all access to admin role', () => {
      const req = createMockRequest({ user: { ...ADMIN_USER } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requirePermission(Permission.USERS_DELETE);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should require all specified permissions', () => {
      const req = createMockRequest({
        user: { ...TEST_USER, role: UserRole.EDITOR },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // EDITOR has ITEMS_CREATE and ITEMS_UPDATE but not ITEMS_DELETE
      const middleware = requirePermission(Permission.ITEMS_CREATE, Permission.ITEMS_DELETE);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.authError?.code).toBe(AuthErrorCode.INSUFFICIENT_PERMISSIONS);
    });
  });

  describe('requireAnyPermission', () => {
    it('should allow if user has any of the permissions', () => {
      const req = createMockRequest({ user: { ...TEST_USER } }); // USER role
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireAnyPermission(Permission.ITEMS_READ, Permission.ITEMS_CREATE);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled(); // USER has ITEMS_READ
    });

    it('should deny if user has none of the permissions', () => {
      const req = createMockRequest({ user: { ...TEST_USER } }); // USER role
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireAnyPermission(Permission.ITEMS_CREATE, Permission.USERS_DELETE);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.authError?.code).toBe(AuthErrorCode.INSUFFICIENT_PERMISSIONS);
    });
  });
});

// ============================================
// Combined Auth Middleware Tests
// ============================================

describe('createAuthMiddleware', () => {
  it('should create middleware with authentication only', async () => {
    const token = jwtService.generateToken({
      sub: TEST_USER.id,
      email: TEST_USER.email,
      role: TEST_USER.role,
    });

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = createAuthMiddleware({ authentication: true });
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });

  it('should create middleware with role requirement', async () => {
    const token = jwtService.generateToken({
      sub: TEST_USER.id,
      email: TEST_USER.email,
      role: UserRole.MODERATOR,
    });

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = createAuthMiddleware({ roles: [UserRole.MODERATOR, UserRole.ADMIN] });
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should create middleware with minimum role', async () => {
    const token = jwtService.generateToken({
      sub: ADMIN_USER.id,
      email: ADMIN_USER.email,
      role: UserRole.ADMIN,
    });

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = createAuthMiddleware({ minRole: UserRole.EDITOR });
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should create middleware with permission requirements', async () => {
    const token = jwtService.generateToken({
      sub: ADMIN_USER.id,
      email: ADMIN_USER.email,
      role: UserRole.ADMIN,
    });

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = createAuthMiddleware({
      permissions: [Permission.ITEMS_DELETE, Permission.USERS_READ],
    });
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should skip auth when authentication is false', async () => {
    const req = createMockRequest(); // No token
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = createAuthMiddleware({ authentication: false });
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });
});

// ============================================
// Error Classes Tests
// ============================================

describe('AuthError', () => {
  it('should create error with all properties', () => {
    const error = new AuthError(
      AuthErrorCode.TOKEN_INVALID,
      'Token has expired',
      401
    );

    expect(error.code).toBe(AuthErrorCode.TOKEN_INVALID);
    expect(error.message).toBe('Token has expired');
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthError');
  });

  it('should use default status code 401', () => {
    const error = new AuthError(AuthErrorCode.TOKEN_MISSING, 'No token provided');
    expect(error.statusCode).toBe(401);
  });
});

// ============================================
// Role Permissions Tests
// ============================================

describe('ROLE_PERMISSIONS', () => {
  it('should assign correct permissions to USER role', () => {
    const permissions = ROLE_PERMISSIONS[UserRole.USER];
    expect(permissions).toContain(Permission.ITEMS_READ);
    expect(permissions).not.toContain(Permission.ITEMS_CREATE);
    expect(permissions).not.toContain(Permission.ADMIN_ALL);
  });

  it('should assign correct permissions to EDITOR role', () => {
    const permissions = ROLE_PERMISSIONS[UserRole.EDITOR];
    expect(permissions).toContain(Permission.ITEMS_READ);
    expect(permissions).toContain(Permission.ITEMS_CREATE);
    expect(permissions).toContain(Permission.ITEMS_UPDATE);
    expect(permissions).not.toContain(Permission.ITEMS_DELETE);
  });

  it('should assign correct permissions to MODERATOR role', () => {
    const permissions = ROLE_PERMISSIONS[UserRole.MODERATOR];
    expect(permissions).toContain(Permission.ITEMS_DELETE);
    expect(permissions).toContain(Permission.USERS_READ);
  });

  it('should assign ADMIN_ALL permission to ADMIN role', () => {
    const permissions = ROLE_PERMISSIONS[UserRole.ADMIN];
    expect(permissions).toContain(Permission.ADMIN_ALL);
    expect(permissions).toContain(Permission.USERS_DELETE);
  });
});
