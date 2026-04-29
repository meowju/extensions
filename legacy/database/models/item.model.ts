/**
 * Item entity model
 * Defines the database schema and entity type for items
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';

// Validation schemas
export const ItemCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional().default(''),
  price: z.number().min(0, 'Price must be >= 0'),
  quantity: z.number().int('Quantity must be an integer').min(0, 'Quantity must be >= 0'),
  tags: z.array(z.string()).optional().default([]),
});

export const ItemUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long'),
  price: z.number().min(0, 'Price must be >= 0'),
  quantity: z.number().int('Quantity must be an integer').min(0, 'Quantity must be >= 0'),
  tags: z.array(z.string()),
});

export const ItemPatchSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  price: z.number().min(0, 'Price must be >= 0').optional(),
  quantity: z.number().int('Quantity must be an integer').min(0, 'Quantity must be >= 0').optional(),
  tags: z.array(z.string()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export type ItemCreateInput = z.infer<typeof ItemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof ItemUpdateSchema>;
export type ItemPatchInput = z.infer<typeof ItemPatchSchema>;

// Domain types
export interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Database row type (raw from SQLite)
export interface ItemRow {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  tags: string;
  created_at: string;
  updated_at: string;
}

export class ItemModel {
  /**
   * Convert database row to Item entity
   */
  static toEntity(row: ItemRow): Item {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      quantity: row.quantity,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Create a new item record from input
   */
  static create(data: ItemCreateInput): {
    id: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
    tags: string;
  } {
    return {
      id: randomUUID(),
      name: data.name.trim(),
      description: (data.description || '').trim(),
      price: data.price,
      quantity: data.quantity,
      tags: JSON.stringify(data.tags || []),
    };
  }

  /**
   * Prepare update data for database
   */
  static prepareUpdate(data: ItemUpdateInput): {
    name: string;
    description: string;
    price: number;
    quantity: number;
    tags: string;
    updated_at: string;
  } {
    return {
      name: data.name.trim(),
      description: (data.description || '').trim(),
      price: data.price,
      quantity: data.quantity,
      tags: JSON.stringify(data.tags || []),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Prepare patch data for database
   */
  static preparePatch(data: ItemPatchInput): Partial<{
    name: string;
    description: string;
    price: number;
    quantity: number;
    tags: string;
    updated_at: string;
  }> {
    const result: Partial<{
      name: string;
      description: string;
      price: number;
      quantity: number;
      tags: string;
      updated_at: string;
    }> = {};

    if (data.name !== undefined) result.name = data.name.trim();
    if (data.description !== undefined) result.description = data.description.trim();
    if (data.price !== undefined) result.price = data.price;
    if (data.quantity !== undefined) result.quantity = data.quantity;
    if (data.tags !== undefined) result.tags = JSON.stringify(data.tags);
    result.updated_at = new Date().toISOString();

    return result;
  }
}

export { ItemModel as default };
