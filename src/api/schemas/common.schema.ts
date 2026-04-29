/**
 * Pagination & Filtering Schemas
 * Common query parameter validation for list endpoints
 */

import { z } from 'zod';

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * Sorting parameters
 */
export const sortSchema = z.object({
  sort: z.enum(['createdAt', 'updatedAt', 'name', 'price']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Combined pagination and sorting
 */
export const listQuerySchema = paginationSchema.merge(sortSchema);

/**
 * UUID parameter schema
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format' }),
});

/**
 * Search query schema
 */
export const searchSchema = z.object({
  q: z.string().max(200).optional(),
  search: z.string().max(200).optional(),
});

/**
 * Filter options schema
 */
export const filterSchema = z.object({
  tags: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

/**
 * Combined list query schema with all options
 */
export const comprehensiveListQuerySchema = listQuerySchema.merge(searchSchema).merge(filterSchema);

/**
 * Type exports
 */
export type PaginationParams = z.infer<typeof paginationSchema>;
export type SortParams = z.infer<typeof sortSchema>;
export type ListQueryParams = z.infer<typeof listQuerySchema>;
export type FilterParams = z.infer<typeof filterSchema>;
export type ComprehensiveListParams = z.infer<typeof comprehensiveListQuerySchema>;