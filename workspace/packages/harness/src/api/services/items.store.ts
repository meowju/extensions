import { v4 as uuidv4 } from 'uuid';
import type { Item, CreateItemInput, UpdateItemInput, PatchItemInput } from '../types/index.js';

// In-memory store for items
class ItemsStore {
  private items: Map<string, Item> = new Map();

  /**
   * Get all items as an array
   */
  getAll(): Item[] {
    return Array.from(this.items.values());
  }

  /**
   * Get items with pagination
   */
  getPaginated(page: number, limit: number): { items: Item[]; total: number } {
    const allItems = this.getAll().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const total = allItems.length;
    const start = (page - 1) * limit;
    const items = allItems.slice(start, start + limit);
    return { items, total };
  }

  /**
   * Get a single item by ID
   */
  getById(id: string): Item | undefined {
    return this.items.get(id);
  }

  /**
   * Check if an item exists with the given name (excluding a specific ID)
   */
  existsByName(name: string, excludeId?: string): boolean {
    for (const item of this.items.values()) {
      if (item.name.toLowerCase() === name.toLowerCase() && item.id !== excludeId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Create a new item
   */
  create(input: CreateItemInput): Item {
    const now = new Date().toISOString();
    const item: Item = {
      id: uuidv4(),
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      price: input.price,
      quantity: input.quantity,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(item.id, item);
    return item;
  }

  /**
   * Update an existing item
   */
  update(id: string, input: UpdateItemInput): Item | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;

    const updated: Item = {
      ...existing,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      price: input.price,
      quantity: input.quantity,
      tags: input.tags ?? [],
      updatedAt: new Date().toISOString(),
    };
    this.items.set(id, updated);
    return updated;
  }

  /**
   * Partially update an item
   */
  patch(id: string, input: PatchItemInput): Item | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;

    const updated: Item = {
      ...existing,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description.trim() }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.tags !== undefined && { tags: input.tags }),
      updatedAt: new Date().toISOString(),
    };
    this.items.set(id, updated);
    return updated;
  }

  /**
   * Delete an item
   */
  delete(id: string): boolean {
    return this.items.delete(id);
  }

  /**
   * Clear all items (for testing)
   */
  clear(): void {
    this.items.clear();
  }

  /**
   * Get total count
   */
  count(): number {
    return this.items.size;
  }
}

// Export singleton instance
export const itemsStore = new ItemsStore();
