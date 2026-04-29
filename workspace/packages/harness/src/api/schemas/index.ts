/**
 * Schema Exports
 * Central export point for all validation schemas
 */

// Auth schemas
export {
  registerSchema,
  loginSchema,
  changePasswordSchema as authChangePasswordSchema,
  refreshTokenSchema,
  passwordSchema,
} from './auth.schema.js';

// Item schemas
export {
  createItemSchema,
  updateItemSchema,
  patchItemSchema,
  paginationSchema,
  idParamSchema,
} from './items.schema.js';

// Common schemas
export {
  paginationSchema as commonPaginationSchema,
  sortSchema,
  listQuerySchema,
  uuidParamSchema,
  searchSchema,
  filterSchema,
  comprehensiveListQuerySchema,
} from './common.schema.js';

// User schemas
export {
  userResponseSchema,
  updateUserSchema,
  changePasswordSchema as userChangePasswordSchema,
  updateUserRoleSchema,
} from './users.schema.js';

// Type exports
export type { CreateItemInput, UpdateItemInput, PatchItemInput, PaginationQuery, IdParam } from './items.schema.js';
export type { PaginationParams, SortParams, ListQueryParams, FilterParams, ComprehensiveListParams } from './common.schema.js';
export type { UserResponse, UpdateUserInput, ChangePasswordInput, UpdateUserRoleInput } from './users.schema.js';