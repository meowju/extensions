/**
 * Authentication & Authorization Types
 * Defines types for JWT tokens, user roles, and request augmentation
 */

// ============================================
// User Roles
// ============================================

/**
 * Role hierarchy for RBAC
 * Order matters: ADMIN > MODERATOR > EDITOR > USER
 */
export enum UserRole {
  USER = 'user',
  EDITOR = 'editor',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

/**
 * Permissions that can be granted to roles
 */
export enum Permission {
  // Item permissions
  ITEMS_READ = 'items:read',
  ITEMS_CREATE = 'items:create',
  ITEMS_UPDATE = 'items:update',
  ITEMS_DELETE = 'items:delete',
  
  // User management permissions
  USERS_READ = 'users:read',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  
  // Role management permissions
  ROLES_READ = 'roles:read',
  ROLES_ASSIGN = 'roles:assign',
  
  // Admin permissions
  ADMIN_ALL = 'admin:all',
}

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.ITEMS_READ,
  ],
  [UserRole.EDITOR]: [
    Permission.ITEMS_READ,
    Permission.ITEMS_CREATE,
    Permission.ITEMS_UPDATE,
  ],
  [UserRole.MODERATOR]: [
    Permission.ITEMS_READ,
    Permission.ITEMS_CREATE,
    Permission.ITEMS_UPDATE,
    Permission.ITEMS_DELETE,
    Permission.USERS_READ,
  ],
  [UserRole.ADMIN]: [
    Permission.ADMIN_ALL,
    Permission.ITEMS_READ,
    Permission.ITEMS_CREATE,
    Permission.ITEMS_UPDATE,
    Permission.ITEMS_DELETE,
    Permission.USERS_READ,
    Permission.USERS_CREATE,
    Permission.USERS_UPDATE,
    Permission.USERS_DELETE,
    Permission.ROLES_READ,
    Permission.ROLES_ASSIGN,
  ],
};

// ============================================
// JWT Types
// ============================================

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string;        // User ID
  email: string;      // User email
  role: UserRole;     // User role
  iat: number;        // Issued at
  exp: number;        // Expiration
}

/**
 * JWT token pair (access + refresh)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * JWT configuration
 */
export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
}

// ============================================
// Authenticated Request Types
// ============================================

/**
 * Authenticated user data (without sensitive fields)
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

/**
 * Extended request with authentication info
 */
export interface AuthenticatedRequest {
  user: AuthenticatedUser;
  tokenVersion: number;
}

// ============================================
// Auth Context (for middleware)
// ============================================

/**
 * Context object passed through auth chain
 */
export interface AuthContext {
  user: AuthenticatedUser | null;
  tokenValid: boolean;
  error?: AuthError;
}

// ============================================
// Error Types
// ============================================

/**
 * Authentication error codes
 */
export enum AuthErrorCode {
  TOKEN_MISSING = 'TOKEN_MISSING',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
}

/**
 * Authentication error with details
 */
export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ============================================
// Authenticated Request types (for Express)
// ============================================

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      authError?: AuthError;
    }
  }
}