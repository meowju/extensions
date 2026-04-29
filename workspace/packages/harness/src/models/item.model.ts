/**
 * Item Model - Mongoose Schema with CRUD Support
 * 
 * Features:
 * - User ownership with referential integrity
 * - Full CRUD support with timestamps
 * - Soft delete capability
 * - Priority and status fields
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import { z } from 'zod';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface IItem {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  tags: string[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IItemMethods {
  softDelete(): Promise<void>;
  restore(): Promise<void>;
}

export interface ItemDocument extends IItem, Document, IItemMethods {}

export interface ItemModel extends Model<ItemDocument> {
  findByUser(userId: string): Promise<ItemDocument[]>;
  findActiveByUser(userId: string): Promise<ItemDocument[]>;
}

// ============================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================

export const ItemStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export const ItemPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const ItemCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .transform(v => v?.trim() || undefined),
  status: ItemStatusSchema.optional().default('pending'),
  priority: ItemPrioritySchema.optional().default('medium'),
  dueDate: z
    .string()
    .datetime({ message: 'Invalid date format. Use ISO 8601 format' })
    .optional()
    .transform(v => v ? new Date(v) : undefined),
  tags: z
    .array(z.string().max(50, 'Tag must be less than 50 characters'))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
    .default([]),
});

export const ItemUpdateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .transform(v => v?.trim() || undefined),
  status: ItemStatusSchema.optional(),
  priority: ItemPrioritySchema.optional(),
  dueDate: z
    .string()
    .datetime({ message: 'Invalid date format. Use ISO 8601 format' })
    .optional()
    .nullable()
    .transform(v => v === null ? undefined : (v ? new Date(v) : undefined)),
  tags: z
    .array(z.string().max(50, 'Tag must be less than 50 characters'))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const ItemQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: ItemStatusSchema.optional(),
  priority: ItemPrioritySchema.optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'priority', 'dueDate']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const ItemIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid item ID format'),
});

export type ItemCreateInput = z.infer<typeof ItemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof ItemUpdateSchema>;
export type ItemQueryInput = z.infer<typeof ItemQuerySchema>;

// ============================================================
// CONSTANTS
// ============================================================

const MAX_TAGS = 20;
const TAG_MAX_LENGTH = 50;
const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;

// ============================================================
// MONGOOSE SCHEMA
// ============================================================

const itemSchema = new Schema<ItemDocument, ItemModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [TITLE_MAX_LENGTH, `Title must be less than ${TITLE_MAX_LENGTH} characters`],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [DESCRIPTION_MAX_LENGTH, `Description must be less than ${DESCRIPTION_MAX_LENGTH} characters`],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in_progress', 'completed', 'cancelled'],
        message: 'Status must be one of: pending, in_progress, completed, cancelled',
      },
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: 'Priority must be one of: low, medium, high, urgent',
      },
      default: 'medium',
      index: true,
    },
    dueDate: {
      type: Date,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= MAX_TAGS;
        },
        message: `Maximum ${MAX_TAGS} tags allowed`,
      },
      set: function (v: string[]) {
        return [...new Set(v.map(tag => tag.toLowerCase().trim()))];
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ============================================================
// INDEXES
// ============================================================

itemSchema.index({ userId: 1, isDeleted: 1 });
itemSchema.index({ userId: 1, status: 1 });
itemSchema.index({ userId: 1, priority: 1 });
itemSchema.index({ userId: 1, dueDate: 1 });
itemSchema.index({ userId: 1, createdAt: -1 });
itemSchema.index({ title: 'text', description: 'text' });

// ============================================================
// INSTANCE METHODS
// ============================================================

/**
 * Soft delete an item
 */
itemSchema.methods.softDelete = async function (): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
};

/**
 * Restore a soft-deleted item
 */
itemSchema.methods.restore = async function (): Promise<void> {
  this.isDeleted = false;
  this.deletedAt = undefined;
};

// ============================================================
// STATIC METHODS
// ============================================================

/**
 * Find all items for a user
 */
itemSchema.statics.findByUser = function (
  userId: string
): Promise<ItemDocument[]> {
  return this.find({ userId }).sort({ createdAt: -1 }).exec();
};

/**
 * Find all active (non-deleted) items for a user
 */
itemSchema.statics.findActiveByUser = function (
  userId: string
): Promise<ItemDocument[]> {
  return this.find({ userId, isDeleted: false }).sort({ createdAt: -1 }).exec();
};

// ============================================================
// QUERY HELPERS
// ============================================================

itemSchema.query.byUser = function (userId: string) {
  return this.where({ userId });
};

itemSchema.query.active = function () {
  return this.where({ isDeleted: false });
};

itemSchema.query.withStatus = function (status: string) {
  return this.where({ status });
};

itemSchema.query.withPriority = function (priority: string) {
  return this.where({ priority });
};

// ============================================================
// EXPORT MODEL
// ============================================================

export const Item = (mongoose.models.Item as ItemModel) ||
  mongoose.model<ItemDocument, ItemModel>('Item', itemSchema);

export default Item;