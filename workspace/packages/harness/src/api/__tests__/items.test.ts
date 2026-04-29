import { describe, it, expect, beforeEach, vi } from 'vitest';
import { itemsService, NotFoundError, ConflictError, ValidationError } from '../services/items.service.js';
import { itemsStore } from '../services/items.store.js';

describe('ItemsService', () => {
  beforeEach(() => {
    // Reset the store before each test
    itemsStore.clear();
  });

  describe('list', () => {
    it('should return empty list when no items exist', () => {
      const result = itemsService.list(1, 10);
      
      expect(result.data).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it('should return paginated items', () => {
      // Create 15 items
      for (let i = 0; i < 15; i++) {
        itemsStore.create({
          name: `Item ${i}`,
          price: 10,
          quantity: 5,
        });
      }

      const result = itemsService.list(1, 5);
      
      expect(result.data.length).toBe(5);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 5,
        total: 15,
        totalPages: 3,
      });
    });

    it('should return correct page of items', () => {
      // Create 10 items
      for (let i = 0; i < 10; i++) {
        itemsStore.create({
          name: `Item ${i}`,
          price: 10,
          quantity: 5,
        });
      }

      const result = itemsService.list(2, 3);
      
      expect(result.data.length).toBe(3);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 3,
        total: 10,
        totalPages: 4,
      });
    });
  });

  describe('getById', () => {
    it('should return item when found', () => {
      const created = itemsStore.create({
        name: 'Test Item',
        price: 99.99,
        quantity: 10,
        description: 'A test item',
      });

      const result = itemsService.getById(created.id);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Item');
      expect(result.price).toBe(99.99);
    });

    it('should throw NotFoundError when item not found', () => {
      expect(() => itemsService.getById('non-existent-id')).toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create a new item', () => {
      const input = {
        name: 'New Item',
        price: 25.50,
        quantity: 100,
        description: 'A new item',
        tags: ['tag1', 'tag2'],
      };

      const result = itemsService.create(input);
      
      expect(result.id).toBeDefined();
      expect(result.name).toBe('New Item');
      expect(result.price).toBe(25.50);
      expect(result.quantity).toBe(100);
      expect(result.description).toBe('A new item');
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should throw ConflictError for duplicate name', () => {
      itemsStore.create({
        name: 'Duplicate',
        price: 10,
        quantity: 5,
      });

      expect(() => itemsService.create({
        name: 'Duplicate',
        price: 20,
        quantity: 10,
      })).toThrow(ConflictError);
    });

    it('should allow creating item with same name as deleted item', () => {
      const item = itemsStore.create({
        name: 'Deleted Item',
        price: 10,
        quantity: 5,
      });
      
      itemsStore.delete(item.id);

      const result = itemsService.create({
        name: 'Deleted Item',
        price: 20,
        quantity: 10,
      });
      
      expect(result.name).toBe('Deleted Item');
    });
  });

  describe('update', () => {
    it('should update an existing item', () => {
      const created = itemsStore.create({
        name: 'Original',
        price: 10,
        quantity: 5,
      });

      const result = itemsService.update(created.id, {
        name: 'Updated',
        price: 20,
        quantity: 10,
        description: 'Updated description',
      });
      
      expect(result.name).toBe('Updated');
      expect(result.price).toBe(20);
      expect(result.quantity).toBe(10);
      expect(result.description).toBe('Updated description');
      expect(result.createdAt).toBe(created.createdAt);
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(created.createdAt).getTime());
    });

    it('should throw NotFoundError for non-existent item', () => {
      expect(() => itemsService.update('non-existent', {
        name: 'Test',
        price: 10,
        quantity: 5,
      })).toThrow(NotFoundError);
    });

    it('should throw ConflictError for duplicate name', () => {
      itemsStore.create({
        name: 'Item 1',
        price: 10,
        quantity: 5,
      });
      
      const item2 = itemsStore.create({
        name: 'Item 2',
        price: 20,
        quantity: 10,
      });

      expect(() => itemsService.update(item2.id, {
        name: 'Item 1',
        price: 25,
        quantity: 15,
      })).toThrow(ConflictError);
    });
  });

  describe('patch', () => {
    it('should partially update an item', () => {
      const created = itemsStore.create({
        name: 'Original',
        price: 10,
        quantity: 5,
        description: 'Original description',
      });

      const result = itemsService.patch(created.id, {
        price: 99.99,
      });
      
      expect(result.name).toBe('Original');
      expect(result.price).toBe(99.99);
      expect(result.quantity).toBe(5);
      expect(result.description).toBe('Original description');
    });

    it('should update multiple fields', () => {
      const created = itemsStore.create({
        name: 'Original',
        price: 10,
        quantity: 5,
      });

      const result = itemsService.patch(created.id, {
        name: 'New Name',
        quantity: 50,
      });
      
      expect(result.name).toBe('New Name');
      expect(result.quantity).toBe(50);
      expect(result.price).toBe(10);
    });
  });

  describe('delete', () => {
    it('should delete an existing item', () => {
      const created = itemsStore.create({
        name: 'To Delete',
        price: 10,
        quantity: 5,
      });

      expect(() => itemsService.getById(created.id)).not.toThrow();
      
      itemsService.delete(created.id);
      
      expect(() => itemsService.getById(created.id)).toThrow(NotFoundError);
    });

    it('should throw NotFoundError for non-existent item', () => {
      expect(() => itemsService.delete('non-existent')).toThrow(NotFoundError);
    });
  });
});

describe('ItemsStore', () => {
  beforeEach(() => {
    itemsStore.clear();
  });

  it('should store and retrieve items', () => {
    const item = itemsStore.create({
      name: 'Test',
      price: 10,
      quantity: 5,
    });

    const retrieved = itemsStore.getById(item.id);
    expect(retrieved).toEqual(item);
  });

  it('should return all items', () => {
    itemsStore.create({ name: 'Item 1', price: 10, quantity: 5 });
    itemsStore.create({ name: 'Item 2', price: 20, quantity: 10 });

    const items = itemsStore.getAll();
    expect(items.length).toBe(2);
  });

  it('should check for existing names', () => {
    itemsStore.create({
      name: 'Existing Item',
      price: 10,
      quantity: 5,
    });

    expect(itemsStore.existsByName('Existing Item')).toBe(true);
    expect(itemsStore.existsByName('Non-existent')).toBe(false);
    expect(itemsStore.existsByName('existing item')).toBe(true); // case-insensitive
  });

  it('should clear all items', () => {
    itemsStore.create({ name: 'Item 1', price: 10, quantity: 5 });
    itemsStore.create({ name: 'Item 2', price: 20, quantity: 10 });

    itemsStore.clear();
    expect(itemsStore.count()).toBe(0);
  });
});
