import { describe, it, expect } from 'vitest';
import {
  createItemSchema,
  updateItemSchema,
  patchItemSchema,
  paginationSchema,
  idParamSchema,
} from '../schemas/items.schema.js';

describe('Items Schemas', () => {
  describe('createItemSchema', () => {
    it('should validate valid input', () => {
      const input = {
        name: 'Test Item',
        price: 99.99,
        quantity: 10,
        description: 'A test item',
        tags: ['tag1', 'tag2'],
      };

      const result = createItemSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate minimal input', () => {
      const input = {
        name: 'Test Item',
        price: 0,
        quantity: 0,
      };

      const result = createItemSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject missing name', () => {
      const input = {
        price: 10,
        quantity: 5,
      };

      const result = createItemSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const input = {
        name: '',
        price: 10,
        quantity: 5,
      };

      const result = createItemSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const input = {
        name: 'a'.repeat(101),
        price: 10,
        quantity: 5,
      };

      const result = createItemSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const input = {
        name: 'Test',
        price: -1,
        quantity: 5,
      };

      const result = createItemSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative quantity', () => {
      const input = {
        name: 'Test',
        price: 10,
        quantity: -1,
      };

      const result = createItemSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer quantity', () => {
      const input = {
        name: 'Test',
        price: 10,
        quantity: 5.5,
      };

      const result = createItemSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from name', () => {
      const input = {
        name: '  Test Item  ',
        price: 10,
        quantity: 5,
      };

      const result = createItemSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Item');
      }
    });

    it('should reject description longer than 500 characters', () => {
      const input = {
        name: 'Test',
        price: 10,
        quantity: 5,
        description: 'a'.repeat(501),
      };

      const result = createItemSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('updateItemSchema', () => {
    it('should validate complete update', () => {
      const input = {
        name: 'Updated Item',
        price: 50,
        quantity: 20,
        description: 'Updated description',
        tags: ['new-tag'],
      };

      const result = updateItemSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require all fields', () => {
      const input = {
        name: 'Updated Item',
      };

      const result = updateItemSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('patchItemSchema', () => {
    it('should validate partial update', () => {
      const input = {
        price: 25.99,
      };

      const result = patchItemSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty update', () => {
      const input = {};

      const result = patchItemSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should allow updating single field', () => {
      const input = {
        name: 'New Name',
      };

      const result = patchItemSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('paginationSchema', () => {
    it('should validate valid pagination', () => {
      const input = {
        page: 1,
        limit: 10,
      };

      const result = paginationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should provide defaults', () => {
      const input = {};

      const result = paginationSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should coerce string numbers', () => {
      const input = {
        page: '2',
        limit: '20',
      };

      const result = paginationSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject page less than 1', () => {
      const input = {
        page: 0,
        limit: 10,
      };

      const result = paginationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const input = {
        page: 1,
        limit: 101,
      };

      const result = paginationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('idParamSchema', () => {
    it('should validate valid UUID', () => {
      const input = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = idParamSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const input = {
        id: 'not-a-uuid',
      };

      const result = idParamSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const input = {};

      const result = idParamSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
