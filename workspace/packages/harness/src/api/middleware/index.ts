/**
 * API Middleware Index
 * Re-exports all middleware components
 */

// ============================================
// Authentication & Authorization
// ============================================

// Types
export {
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  type JwtPayload,
  type TokenPair,
  type JwtConfig,
  type AuthenticatedUser,
  type AuthenticatedRequest,
  type AuthContext,
  AuthErrorCode,
  AuthError,
} from './auth.types.js';

// JWT Service
export { JwtService, jwtService, TokenBlacklist } from './jwt.service.js';

// Auth Middleware Functions
export {
  extractToken,
  authenticate,
  optionalAuth,
  requireRole,
  requireMinRole,
  requirePermission,
  requireAnyPermission,
  requireOwnerOrPermission,
  buildAuthContext,
  createAuthMiddleware,
  type AuthMiddlewareOptions,
  type AuthContext,
} from './auth.middleware.js';

// ============================================
// Rate Limiting
// ============================================

export {
  rateLimit,
  createApiRateLimiter,
  createStrictRateLimiter,
  createAuthRateLimiter,
  createUploadRateLimiter,
  createSearchRateLimiter,
  createUserRateLimiter,
  skipWithApiKey,
  skipLocalhost,
  skipPremiumUsers,
  MemoryStore,
  RateLimitExceededError,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimitStore,
} from './rate-limiter.js';

// ============================================
// Request Logging
// ============================================

export {
  createRequestLogger,
  minimalLogger,
  detailedLogger,
  jsonLogger,
  requestIdMiddleware,
  getRequestId,
  createStructuredLog,
  type RequestLogEntry,
  type RequestHeaders,
  type LogOptions,
} from './request-logger.js';

// ============================================
// Error Handling
// ============================================

export { errorHandler } from './error-handler.js';

// ============================================
// Re-export types for convenience
// ============================================

export type { ApiError, ErrorResponse } from '../types/index.js';