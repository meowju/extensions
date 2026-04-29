import { z } from 'zod';

// Zod v4 API compatibility
const ZodIssueCode = (z as any).ZodIssueCode ?? (z as any).issueCodes ?? {
  custom: 'custom',
  invalid_type: 'invalid_type',
  too_small: 'too_small',
  too_big: 'too_big',
};

// Base item schema with shared validation rules
const baseItemSchema = {
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .default(''),
  price: z
    .number({ required_error: 'Price is required' })
    .min(0, 'Price must be >= 0'),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(0, 'Quantity must be >= 0'),
  tags: z
    .array(z.string())
    .optional()
    .default([]),
};

// Schema for creating items (POST /items)
export const createItemSchema = z.object(baseItemSchema);

// Schema for updating items (PUT /items/:id)
export const updateItemSchema = z.object(baseItemSchema);

// Schema for partial updates (PATCH /items/:id)
export const patchItemSchema = z.object({
  name: baseItemSchema.name.optional(),
  description: baseItemSchema.description.optional(),
  price: baseItemSchema.price.optional(),
  quantity: baseItemSchema.quantity.optional(),
  tags: baseItemSchema.tags.optional(),
}).refine(
  (data) => Object.values(data).some(
    (v) => v !== undefined && v !== null
  ),
  {
    message: 'At least one field must be provided',
  }
);

// Schema for pagination query params
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Schema for ID parameter
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format' }),
});

// Type exports derived from schemas
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type PatchItemInput = z.infer<typeof patchItemSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
