/**
 * Item model unit tests
 */

import { describe, it, expect } from 'vitest';
import { ItemModel, ItemCreateSchema, ItemUpdateSchema, ItemPatchSchema } from '../models/item.model.js';

describe('ItemModel', () => {
  describe('create', () => {
    it('should create a new item with UUID', () => {
      const input = {
        name: 'Test Item',
        price: 19.99,
        quantity: 10,
      };

      const result = ItemModel.create(input);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Test Item');
      expect(result.price).toBe(19.99);
      expect(result.quantity).toBe(10);
      expect(result.tags).toBe('[]');
    });

    it('should trim name', () => {
      const input = {
        name: '  Test Item  ',
        price: 19.99,
        quantity: 10,
      };

      const result = ItemModel.create(input);

      expect(result.name).toBe('Test Item');
    });

    it('should handle optional fields', () => {
      const input = {
        name: 'Test Item',
        price: 19.99,
        quantity: 10,
        tags: ['electronics', 'sale'],
      };

      const result = ItemModel.create(input);

      expect(result.tags).toBe(JSON.stringify(['electronics', 'sale']));
    });

    it('should generate unique IDs', () => {
      const input = {
        name: 'Test Item',
        price: 19.99,
        quantity: 10,
      };

      const result1 = ItemModel.create(input);
      const result2 = ItemModel.create(input);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('toEntity', () => {
    it('should convert database row to entity', () => {
      const row = {
        id: '123',
        name: 'Test Item',
        description: 'A test item',
        price: 19.99,
        quantity: 10,
        tags: '["electronics","sale"]',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = ItemModel.toEntity(row);

      expect(result).toEqual({
        id: '123',
        name: 'Test Item',
        description: 'A test item',
        price: 19.99,
        quantity: 10,
        tags: ['electronics', 'sale'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should handle empty tags', () => {
      const row = {
        id: '123',
        name: 'Test Item',
        description: 'A test item',
        price: 19.99,
        quantity: 10,
        tags: '',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = ItemModel.toEntity(row);

      expect(result.tags).toEqual([]);
    });
  });

  describe('prepareUpdate', () => {
    it('should prepare update data with timestamp', () => {
      const input = {
        name: 'Updated Item',
        description: 'Updated description',
        price: 29.99,
        quantity: 20,
        tags: ['updated'],
      };

      const result = ItemModel.prepareUpdate(input);

      expect(result.name).toBe('Updated Item');
      expect(result.description).toBe('Updated description');
      expect(result.price).toBe(29.99);
      expect(result.quantity).toBe(20);
      expect(result.tags).toBe(JSON.stringify(['updated']));
      expect(result.updated_at).toBeDefined();
    });
  });

  describe('preparePatch', () => {
    it('should prepare patch data with only changed fields', () => {
      const input = {
        name: 'Patched Item',
        price: 39.99,
      };

      const result = ItemModel.preparePatch(input);

      expect(result.name).toBe('Patched Item');
      expect(result.price).toBe(39.99);
      expect(result).not.toHaveProperty('description');
      expect(result).not.toHaveProperty('quantity');
      expect(result).not.toHaveProperty('tags');
      expect(result.updated_at).toBeDefined();
    });

    it('should not include fields that are undefined', () => {
      const input: { name?: string } = {};

      const result = ItemModel.preparePatch(input);

      expect(Object.keys(result).length).toBe(1); // Only updated_at
    });
  });
});

describe('ItemCreateSchema', () => {
  it('should validate valid input', () => {
    const input = {
      name: 'Test Item',
      price: 19.99,
      quantity: 10,
    };

    const result = ItemCreateSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should reject negative price', () => {
    const input = {
      name: 'Test Item',
      price: -1,
      quantity: 10,
    };

    const result = ItemCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject negative quantity', () => {
    const input = {
      name: 'Test Item',
      price: 19.99,
      quantity: -1,
    };

    const result = ItemCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject non-integer quantity', () => {
    const input = {
      name: 'Test Item',
      price: 19.99,
      quantity: 1.5,
    };

    const result = ItemCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const input = {
      name: '',
      price: 19.99,
      quantity: 10,
    };

    const result = ItemCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject name too long', () => {
    const input = {
      name: 'a'.repeat(101),
      price: 19.99,
      quantity: 10,
    };

    const result = ItemCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should validate with optional description', () => {
    const input = {
      name: 'Test Item',
      description: 'A test item',
      price: 19.99,
      quantity: 10,
    };

    const result = ItemCreateSchema.safeParse(input);

    expect(result.success).toBe(true);
  });
});

describe('ItemPatchSchema', () => {
  it('should validate partial update', () => {
    const input = {
      price: 29.99,
    };

    const result = ItemPatchSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should reject empty patch', () => {
    const input = {};

    const result = ItemPatchSchema.safeParse(input);

    expect(result.success).toBe(false);
  });
});
