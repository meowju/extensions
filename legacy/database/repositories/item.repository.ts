/**
 * Item repository
 * Handles all database operations for items
 */

import { getDatabase } from '../index.js';
import { ItemModel, type Item, type ItemCreateInput, type ItemUpdateInput, type ItemPatchInput } from '../models/item.model.js';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IItemRepository {
  findAll(options?: PaginationOptions): Promise<PaginatedResult<Item>>;
  findById(id: string): Promise<Item | null>;
  findByName(name: string): Promise<Item | null>;
  create(data: ItemCreateInput): Promise<Item>;
  update(id: string, data: ItemUpdateInput): Promise<Item | null>;
  patch(id: string, data: ItemPatchInput): Promise<Item | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
  search(query: string, options?: PaginationOptions): Promise<PaginatedResult<Item>>;
}

export class ItemRepository implements IItemRepository {
  private get db() {
    return getDatabase();
  }

  async findAll(options: PaginationOptions = { page: 1, limit: 20 }): Promise<PaginatedResult<Item>> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM items');
    const countResult = countStmt.get() as { count: number };
    const total = countResult.count;

    const stmt = this.db.prepare(`
      SELECT id, name, description, price, quantity, tags, created_at, updated_at
      FROM items
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limit, offset) as Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      quantity: number;
      tags: string;
      created_at: string;
      updated_at: string;
    }>;

    return {
      data: rows.map(row => ItemModel.toEntity(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Item | null> {
    const stmt = this.db.prepare(`
      SELECT id, name, description, price, quantity, tags, created_at, updated_at
      FROM items
      WHERE id = ?
    `);
    const row = stmt.get(id) as {
      id: string;
      name: string;
      description: string;
      price: number;
      quantity: number;
      tags: string;
      created_at: string;
      updated_at: string;
    } | undefined;
    return row ? ItemModel.toEntity(row) : null;
  }

  async findByName(name: string): Promise<Item | null> {
    const stmt = this.db.prepare(`
      SELECT id, name, description, price, quantity, tags, created_at, updated_at
      FROM items
      WHERE name = ? COLLATE NOCASE
    `);
    const row = stmt.get(name) as {
      id: string;
      name: string;
      description: string;
      price: number;
      quantity: number;
      tags: string;
      created_at: string;
      updated_at: string;
    } | undefined;
    return row ? ItemModel.toEntity(row) : null;
  }

  async create(data: ItemCreateInput): Promise<Item> {
    const itemData = ItemModel.create(data);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO items (id, name, description, price, quantity, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      itemData.id,
      itemData.name,
      itemData.description,
      itemData.price,
      itemData.quantity,
      itemData.tags,
      now,
      now
    );

    return {
      id: itemData.id,
      name: itemData.name,
      description: itemData.description,
      price: itemData.price,
      quantity: itemData.quantity,
      tags: JSON.parse(itemData.tags),
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(id: string, data: ItemUpdateInput): Promise<Item | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updateData = ItemModel.prepareUpdate(data);
    const now = updateData.updated_at;
    delete updateData.updated_at;

    const stmt = this.db.prepare(`
      UPDATE items 
      SET name = ?, description = ?, price = ?, quantity = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updateData.name,
      updateData.description,
      updateData.price,
      updateData.quantity,
      updateData.tags,
      now,
      id
    );

    return this.findById(id);
  }

  async patch(id: string, data: ItemPatchInput): Promise<Item | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const patchData = ItemModel.preparePatch(data);
    if (Object.keys(patchData).length === 0) return existing;

    const sets: string[] = [];
    const values: (string | number)[] = [];

    if (patchData.name !== undefined) {
      sets.push('name = ?');
      values.push(patchData.name);
    }
    if (patchData.description !== undefined) {
      sets.push('description = ?');
      values.push(patchData.description);
    }
    if (patchData.price !== undefined) {
      sets.push('price = ?');
      values.push(patchData.price);
    }
    if (patchData.quantity !== undefined) {
      sets.push('quantity = ?');
      values.push(patchData.quantity);
    }
    if (patchData.tags !== undefined) {
      sets.push('tags = ?');
      values.push(patchData.tags);
    }
    if (patchData.updated_at !== undefined) {
      sets.push('updated_at = ?');
      values.push(patchData.updated_at);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE items SET ${sets.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM items WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async count(): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM items');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  async search(query: string, options: PaginationOptions = { page: 1, limit: 20 }): Promise<PaginatedResult<Item>> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;
    const searchTerm = `%${query}%`;

    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM items 
      WHERE name LIKE ? OR description LIKE ?
    `);
    const countResult = countStmt.get(searchTerm, searchTerm) as { count: number };
    const total = countResult.count;

    const stmt = this.db.prepare(`
      SELECT id, name, description, price, quantity, tags, created_at, updated_at
      FROM items
      WHERE name LIKE ? OR description LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(searchTerm, searchTerm, limit, offset) as Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      quantity: number;
      tags: string;
      created_at: string;
      updated_at: string;
    }>;

    return {
      data: rows.map(row => ItemModel.toEntity(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

// Singleton instance
export const itemRepository = new ItemRepository();
