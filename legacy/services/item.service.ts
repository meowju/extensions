/**
 * Item Service - Business Logic for Item CRUD Operations
 * 
 * Handles item creation, reading, updating, deletion with proper
 * authorization checks and error handling.
 */

import { Item, ItemDocument, ItemCreateInput, ItemUpdateInput } from '../../models/item.model';
import mongoose from 'mongoose';

export class ItemServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ItemServiceError';
  }
}

export interface CreateItemResult {
  success: boolean;
  item?: ItemDocument;
  error?: string;
}

export interface UpdateItemResult {
  success: boolean;
  item?: ItemDocument;
  error?: string;
}

export interface DeleteItemResult {
  success: boolean;
  error?: string;
}

export interface GetItemResult {
  success: boolean;
  item?: ItemDocument;
  error?: string;
}

export interface ListItemsResult {
  success: boolean;
  items: ItemDocument[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

/**
 * Item Service - handles all item-related business logic
 */
export class ItemService {
  /**
   * Create a new item
   */
  async createItem(userId: string, input: ItemCreateInput): Promise<CreateItemResult> {
    try {
      const item = new Item({
        userId: new mongoose.Types.ObjectId(userId),
        title: input.title,
        description: input.description,
        status: input.status || 'pending',
        priority: input.priority || 'medium',
        dueDate: input.dueDate,
        tags: input.tags || [],
      });

      await item.save();

      return {
        success: true,
        item,
      };
    } catch (error) {
      console.error('Create item error:', error);
      return {
        success: false,
        error: 'Failed to create item. Please try again.',
      };
    }
  }

  /**
   * Get a single item by ID (user must own it)
   */
  async getItemById(itemId: string, userId: string): Promise<GetItemResult> {
    try {
      const item = await Item.findOne({
        _id: new mongoose.Types.ObjectId(itemId),
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: false,
      });

      if (!item) {
        return {
          success: false,
          error: 'Item not found',
        };
      }

      return {
        success: true,
        item,
      };
    } catch (error) {
      console.error('Get item error:', error);
      return {
        success: false,
        error: 'Failed to retrieve item',
      };
    }
  }

  /**
   * List items for a user with filtering, searching, and pagination
   */
  async listItems(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {}
  ): Promise<ListItemsResult> {
    try {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(Math.max(1, options.limit || 20), 100);
      const skip = (page - 1) * limit;

      // Build query
      const query: Record<string, any> = {
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: false,
      };

      // Status filter
      if (options.status) {
        query.status = options.status;
      }

      // Priority filter
      if (options.priority) {
        query.priority = options.priority;
      }

      // Text search
      if (options.search) {
        query.$or = [
          { title: { $regex: options.search, $options: 'i' } },
          { description: { $regex: options.search, $options: 'i' } },
          { tags: { $regex: options.search, $options: 'i' } },
        ];
      }

      // Sort configuration
      const sortField = options.sortBy || 'createdAt';
      const sortDirection = options.sortOrder === 'asc' ? 1 : -1;
      const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

      // Execute query with pagination
      const [items, total] = await Promise.all([
        Item.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Item.countDocuments(query),
      ]);

      return {
        success: true,
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('List items error:', error);
      return {
        success: false,
        items: [],
        total: 0,
        page: 1,
        totalPages: 0,
        error: 'Failed to list items',
      };
    }
  }

  /**
   * Update an item (user must own it)
   */
  async updateItem(
    itemId: string,
    userId: string,
    updates: ItemUpdateInput
  ): Promise<UpdateItemResult> {
    try {
      // Build update object (exclude undefined values)
      const updateData: Record<string, any> = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      // If no valid updates, return error
      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No valid fields to update',
        };
      }

      const item = await Item.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(itemId),
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false,
        },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!item) {
        return {
          success: false,
          error: 'Item not found',
        };
      }

      return {
        success: true,
        item,
      };
    } catch (error) {
      console.error('Update item error:', error);
      return {
        success: false,
        error: 'Failed to update item',
      };
    }
  }

  /**
   * Delete an item (soft delete by default)
   */
  async deleteItem(itemId: string, userId: string, hardDelete = false): Promise<DeleteItemResult> {
    try {
      if (hardDelete) {
        // Permanent deletion
        const result = await Item.deleteOne({
          _id: new mongoose.Types.ObjectId(itemId),
          userId: new mongoose.Types.ObjectId(userId),
        });

        if (result.deletedCount === 0) {
          return {
            success: false,
            error: 'Item not found',
          };
        }
      } else {
        // Soft delete
        const item = await Item.findOne({
          _id: new mongoose.Types.ObjectId(itemId),
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false,
        });

        if (!item) {
          return {
            success: false,
            error: 'Item not found',
          };
        }

        await item.softDelete();
        await item.save();
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Delete item error:', error);
      return {
        success: false,
        error: 'Failed to delete item',
      };
    }
  }

  /**
   * Restore a soft-deleted item
   */
  async restoreItem(itemId: string, userId: string): Promise<UpdateItemResult> {
    try {
      const item = await Item.findOne({
        _id: new mongoose.Types.ObjectId(itemId),
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: true,
      });

      if (!item) {
        return {
          success: false,
          error: 'Item not found or not deleted',
        };
      }

      await item.restore();
      await item.save();

      return {
        success: true,
        item,
      };
    } catch (error) {
      console.error('Restore item error:', error);
      return {
        success: false,
        error: 'Failed to restore item',
      };
    }
  }

  /**
   * Get deleted items for a user
   */
  async listDeletedItems(userId: string, page = 1, limit = 20): Promise<ListItemsResult> {
    try {
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Item.find({
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: true,
        })
          .sort({ deletedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Item.countDocuments({
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: true,
        }),
      ]);

      return {
        success: true,
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('List deleted items error:', error);
      return {
        success: false,
        items: [],
        total: 0,
        page: 1,
        totalPages: 0,
        error: 'Failed to list deleted items',
      };
    }
  }

  /**
   * Bulk delete items (soft delete by default)
   */
  async bulkDelete(
    itemIds: string[],
    userId: string,
    hardDelete = false
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const objectIds = itemIds.map(id => new mongoose.Types.ObjectId(id));

      if (hardDelete) {
        const result = await Item.deleteMany({
          _id: { $in: objectIds },
          userId: new mongoose.Types.ObjectId(userId),
        });

        return {
          success: true,
          deletedCount: result.deletedCount,
        };
      } else {
        const result = await Item.updateMany(
          {
            _id: { $in: objectIds },
            userId: new mongoose.Types.ObjectId(userId),
            isDeleted: false,
          },
          {
            $set: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          }
        );

        return {
          success: true,
          deletedCount: result.modifiedCount,
        };
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      return {
        success: false,
        deletedCount: 0,
        error: 'Failed to delete items',
      };
    }
  }

  /**
   * Get item statistics for a user
   */
  async getItemStats(userId: string): Promise<{
    success: boolean;
    stats?: {
      total: number;
      byStatus: Record<string, number>;
      byPriority: Record<string, number>;
      overdue: number;
      completed: number;
    };
    error?: string;
  }> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const [total, statusStats, priorityStats, overdueCount, completedCount] = await Promise.all([
        Item.countDocuments({ userId: userObjectId, isDeleted: false }),
        Item.aggregate([
          { $match: { userId: userObjectId, isDeleted: false } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Item.aggregate([
          { $match: { userId: userObjectId, isDeleted: false } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
        Item.countDocuments({
          userId: userObjectId,
          isDeleted: false,
          dueDate: { $lt: new Date() },
          status: { $nin: ['completed', 'cancelled'] },
        }),
        Item.countDocuments({
          userId: userObjectId,
          isDeleted: false,
          status: 'completed',
        }),
      ]);

      const byStatus: Record<string, number> = {};
      statusStats.forEach(stat => {
        byStatus[stat._id] = stat.count;
      });

      const byPriority: Record<string, number> = {};
      priorityStats.forEach(stat => {
        byPriority[stat._id] = stat.count;
      });

      return {
        success: true,
        stats: {
          total,
          byStatus,
          byPriority,
          overdue: overdueCount,
          completed: completedCount,
        },
      };
    } catch (error) {
      console.error('Get item stats error:', error);
      return {
        success: false,
        error: 'Failed to get item statistics',
      };
    }
  }
}

// Export singleton instance
export const itemService = new ItemService();
export default itemService;