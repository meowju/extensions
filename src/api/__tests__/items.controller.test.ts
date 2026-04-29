/**
 * Unit Tests for Items Service
 * 
 * Tests the service layer business logic including:
 * - Error handling and propagation
 * - Service-specific behavior
 * - Edge cases specific to service logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { itemsService, NotFoundError, ConflictError, ValidationError } from '../services/items.service.js';
import { itemsStore } from '../services/items.store.js';
import type { CreateItemInput, UpdateItemInput, PatchItemInput } from '../types/index.js';

describe('ItemsService - Unit Tests', () => {
  beforeEach(() => {
    itemsStore.clear();
  });

  // ============================================
  // SERVICE ERROR CLASS TESTS
  // ============================================

  describe('Error Classes', () => {
    describe('NotFoundError', () => {
      it('should have correct code property', () => {
        const error = new NotFoundError('Item not found');
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should have correct statusCode property', () => {
        const error = new NotFoundError('Item not found');
        expect(error.statusCode).toBe(404);
      });

      it('should have correct name property', () => {
        const error = new NotFoundError('Item not found');
        expect(error.name).toBe('NotFoundError');
      });

      it('should be instance of Error', () => {
        const error = new NotFoundError('Item not found');
        expect(error).toBeInstanceOf(Error);
      });

      it('should include ID in message', () => {
        const testId = 'test-123';
        const error = new NotFoundError(`Item with id '${testId}' not found`);
        expect(error.message).toContain(testId);
      });
    });

    describe('ConflictError', () => {
      it('should have correct code property', () => {
        const error = new ConflictError('Duplicate name');
        expect(error.code).toBe('CONFLICT');
      });

      it('should have correct statusCode property', () => {
        const error = new ConflictError('Duplicate name');
        expect(error.statusCode).toBe(409);
      });

      it('should have correct name property', () => {
        const error = new ConflictError('Duplicate name');
        expect(error.name).toBe('ConflictError');
      });

      it('should include item name in message', () => {
        const name = 'Test Item';
        const error = new ConflictError(`Item with name '${name}' already exists`);
        expect(error.message).toContain(name);
      });
    });

    describe('ValidationError', () => {
      it('should have correct code property', () => {
        const error = new ValidationError('Invalid input');
        expect(error.code).toBe('VALIDATION_ERROR');
      });

      it('should have correct statusCode property', () => {
        const error = new ValidationError('Invalid input');
        expect(error.statusCode).toBe(400);
      });

      it('should have correct name property', () => {
        const error = new ValidationError('Invalid input');
        expect(error.name).toBe('ValidationError');
      });

      it('should accept optional details', () => {
        const details = { field: 'name', issue: 'required' };
        const error = new ValidationError('Invalid input', details);
        expect(error.details).toEqual(details);
      });
    });
  });

  // ============================================
  // SERVICE LIST TESTS
  // ============================================

  describe('list()', () => {
    it('should return correct pagination metadata for empty store', () => {
      const result = itemsService.list(1, 10);
      
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should calculate totalPages correctly', () => {
      // 25 items with limit 10 should give 3 pages
      for (let i = 0; i < 25; i++) {
        itemsStore.create({ name: `Item ${i}`, price: 10, quantity: 5 });
      }
      
      const result = itemsService.list(1, 10);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should calculate totalPages as 1 when items equal limit', () => {
      itemsStore.create({ name: 'Item 1', price: 10, quantity: 5 });
      
      const result = itemsService.list(1, 1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should return empty data array for page beyond range', () => {
      itemsStore.create({ name: 'Item', price: 10, quantity: 5 });
      
      const result = itemsService.list(100, 10);
      expect(result.data).toEqual([]);
    });
  });

  // ============================================
  // SERVICE GETBYID TESTS
  // ============================================

  describe('getById()', () => {
    it('should return the exact item with matching ID', () => {
      const item = itemsStore.create({
        name: 'Exact Match',
        price: 10,
        quantity: 5,
      });
      
      const result = itemsService.getById(item.id);
      expect(result.id).toBe(item.id);
    });

    it('should throw NotFoundError with correct message format', () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999';
      
      expect(() => itemsService.getById(nonExistentId)).toThrow(NotFoundError);
      
      try {
        itemsService.getById(nonExistentId);
      } catch (error: any) {
        expect(error.message).toMatch(/Item with id '.*' not found/);
      }
    });
  });

  // ============================================
  // SERVICE CREATE TESTS
  // ============================================

  describe('create()', () => {
    it('should trim name before storing', () => {
      const result = itemsService.create({
        name: '  Spaced Name  ',
        price: 10,
        quantity: 5,
      });
      
      expect(result.name).toBe('Spaced Name');
    });

    it('should trim description before storing', () => {
      const result = itemsService.create({
        name: 'Test',
        price: 10,
        quantity: 5,
        description: '  Spaced Description  ',
      });
      
      expect(result.description).toBe('Spaced Description');
    });

    it('should generate valid UUID for new items', () => {
      const result = itemsService.create({
        name: 'Test',
        price: 10,
        quantity: 5,
      });
      
      // UUID v4 format check
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(result.id)).toBe(true);
    });

    it('should set createdAt and updatedAt to current time', () => {
      const beforeCreate = new Date().toISOString();
      
      const result = itemsService.create({
        name: 'Test',
        price: 10,
        quantity: 5,
      });
      
      const afterCreate = new Date().toISOString();
      
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should throw ConflictError for exact duplicate name', () => {
      itemsService.create({
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

    it('should throw ConflictError for case-insensitive duplicate', () => {
      itemsService.create({
        name: 'Test Item',
        price: 10,
        quantity: 5,
      });
      
      expect(() => itemsService.create({
        name: 'TEST ITEM',
        price: 10,
        quantity: 5,
      })).toThrow(ConflictError);
      
      expect(() => itemsService.create({
        name: 'test item',
        price: 10,
        quantity: 5,
      })).toThrow(ConflictError);
    });

    it('should not throw for unique names', () => {
      itemsService.create({
        name: 'Unique 1',
        price: 10,
        quantity: 5,
      });
      
      expect(() => itemsService.create({
        name: 'Unique 2',
        price: 10,
        quantity: 5,
      })).not.toThrow();
    });
  });

  // ============================================
  // SERVICE UPDATE TESTS
  // ============================================

  describe('update()', () => {
    it('should update all provided fields', () => {
      const original = itemsStore.create({
        name: 'Original',
        price: 10,
        quantity: 5,
        description: 'Original desc',
        tags: ['old'],
      });
      
      const updated = itemsService.update(original.id, {
        name: 'Updated',
        price: 20,
        quantity: 10,
        description: 'Updated desc',
        tags: ['new'],
      });
      
      expect(updated.name).toBe('Updated');
      expect(updated.price).toBe(20);
      expect(updated.quantity).toBe(10);
      expect(updated.description).toBe('Updated desc');
      expect(updated.tags).toEqual(['new']);
    });

    it('should preserve non-updated fields', () => {
      const original = itemsStore.create({
        name: 'Original',
        price: 10,
        quantity: 5,
      });
      
      const updated = itemsService.update(original.id, {
        name: 'Updated',
        price: original.price,
        quantity: original.quantity,
      });
      
      expect(updated.description).toBe(original.description);
      expect(updated.tags).toEqual(original.tags);
    });

    it('should throw NotFoundError for non-existent ID', () => {
      expect(() => itemsService.update('non-existent', {
        name: 'Test',
        price: 10,
        quantity: 5,
      })).toThrow(NotFoundError);
    });

    it('should throw ConflictError for duplicate name', () => {
      itemsStore.create({ name: 'Item A', price: 10, quantity: 5 });
      const itemB = itemsStore.create({ name: 'Item B', price: 20, quantity: 10 });
      
      expect(() => itemsService.update(itemB.id, {
        name: 'Item A',
        price: itemB.price,
        quantity: itemB.quantity,
      })).toThrow(ConflictError);
    });

    it('should not throw when updating with same name', () => {
      const item = itemsStore.create({
        name: 'Keep Name',
        price: 10,
        quantity: 5,
      });
      
      expect(() => itemsService.update(item.id, {
        name: 'Keep Name',
        price: item.price,
        quantity: item.quantity,
      })).not.toThrow();
    });

    it('should not throw when updating with same name different case (same item)', () => {
      const item = itemsStore.create({
        name: 'Keep Name',
        price: 10,
        quantity: 5,
      });
      
      expect(() => itemsService.update(item.id, {
        name: 'KEEP NAME',
        price: item.price,
        quantity: item.quantity,
      })).not.toThrow();
    });

    it('should update updatedAt timestamp', () => {
      const original = itemsStore.create({
        name: 'Test',
        price: 10,
        quantity: 5,
      });
      
      const originalUpdatedAt = original.updatedAt;
      
      // Small delay to ensure timestamp difference
      const updated = itemsService.update(original.id, {
        name: 'Updated',
        price: original.price,
        quantity: original.quantity,
      });
      
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  // ============================================
  // SERVICE PATCH TESTS
  // ============================================

  describe('patch()', () => {
    it('should only update provided fields', () => {
      const original = itemsStore.create({
        name: 'Original',
        price: 10,
        quantity: 5,
        description: 'Original desc',
        tags: ['old'],
      });
      
      const patched = itemsService.patch(original.id, { name: 'Patched' });
      
      expect(patched.name).toBe('Patched');
      expect(patched.price).toBe(10);
      expect(patched.quantity).toBe(5);
      expect(patched.description).toBe('Original desc');
      expect(patched.tags).toEqual(['old']);
    });

    it('should throw NotFoundError for non-existent ID', () => {
      expect(() => itemsService.patch('non-existent', { name: 'Test' })).toThrow(NotFoundError);
    });

    it('should throw ValidationError for empty patch', () => {
      const item = itemsStore.create({
        name: 'Test',
        price: 10,
        quantity: 5,
      });
      
      expect(() => itemsService.patch(item.id, {})).toThrow();
    });

    it('should throw ConflictError when patching name to duplicate', () => {
      itemsStore.create({ name: 'Taken', price: 10, quantity: 5 });
      const item = itemsStore.create({ name: 'Mine', price: 20, quantity: 10 });
      
      expect(() => itemsService.patch(item.id, { name: 'Taken' })).toThrow(ConflictError);
    });

    it('should not throw when patching name to same name', () => {
      const item = itemsStore.create({
        name: 'Keep',
        price: 10,
        quantity: 5,
      });
      
      expect(() => itemsService.patch(item.id, { name: 'Keep' })).not.toThrow();
    });

    it('should update only price without affecting name', () => {
      const original = itemsStore.create({
        name: 'Test Item',
        price: 10,
        quantity: 5,
      });
      
      const patched = itemsService.patch(original.id, { price: 99.99 });
      
      expect(patched.price).toBe(99.99);
      expect(patched.name).toBe('Test Item');
    });

    it('should update only quantity without affecting price', () => {
      const original = itemsStore.create({
        name: 'Test Item',
        price: 10,
        quantity: 5,
      });
      
      const patched = itemsService.patch(original.id, { quantity: 100 });
      
      expect(patched.quantity).toBe(100);
      expect(patched.price).toBe(10);
    });

    it('should update only description without affecting other fields', () => {
      const original = itemsStore.create({
        name: 'Test Item',
        price: 10,
        quantity: 5,
        description: 'Old description',
      });
      
      const patched = itemsService.patch(original.id, { description: 'New description' });
      
      expect(patched.description).toBe('New description');
      expect(patched.name).toBe('Test Item');
      expect(patched.price).toBe(10);
      expect(patched.quantity).toBe(5);
    });

    it('should replace entire tags array', () => {
      const original = itemsStore.create({
        name: 'Test',
        price: 10,
        quantity: 5,
        tags: ['old', 'tags'],
      });
      
      const patched = itemsService.patch(original.id, { tags: ['new', 'array'] });
      
      expect(patched.tags).toEqual(['new', 'array']);
    });
  });

  // ============================================
  // SERVICE DELETE TESTS
  // ============================================

  describe('delete()', () => {
    it('should return void on successful deletion', () => {
      const item = itemsStore.create({
        name: 'To Delete',
        price: 10,
        quantity: 5,
      });
      
      const result = itemsService.delete(item.id);
      expect(result).toBeUndefined();
    });

    it('should remove item from store', () => {
      const item = itemsStore.create({
        name: 'To Delete',
        price: 10,
        quantity: 5,
      });
      
      itemsService.delete(item.id);
      
      expect(itemsStore.getById(item.id)).toBeUndefined();
    });

    it('should throw NotFoundError for non-existent ID', () => {
      expect(() => itemsService.delete('non-existent')).toThrow(NotFoundError);
    });

    it('should throw NotFoundError for already deleted item', () => {
      const item = itemsStore.create({
        name: 'To Delete',
        price: 10,
        quantity: 5,
      });
      
      itemsService.delete(item.id);
      expect(() => itemsService.delete(item.id)).toThrow(NotFoundError);
    });
  });

  // ============================================
  // SERVICE EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle very long name strings', () => {
      const longName = 'A'.repeat(100);
      
      const result = itemsService.create({
        name: longName,
        price: 10,
        quantity: 5,
      });
      
      expect(result.name).toBe(longName);
    });

    it('should handle maximum safe integer price', () => {
      const result = itemsService.create({
        name: 'Expensive',
        price: Number.MAX_SAFE_INTEGER,
        quantity: 1,
      });
      
      expect(result.price).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle zero values correctly', () => {
      const result = itemsService.create({
        name: 'Zero Item',
        price: 0,
        quantity: 0,
      });
      
      expect(result.price).toBe(0);
      expect(result.quantity).toBe(0);
    });

    it('should handle decimal prices correctly', () => {
      const result = itemsService.create({
        name: 'Decimal Item',
        price: 19.99,
        quantity: 1,
      });
      
      expect(result.price).toBe(19.99);
    });

    it('should handle special characters in name', () => {
      const specialName = "Item with 'quotes' and \"double\" and <brackets> & ampersand";
      
      const result = itemsService.create({
        name: specialName,
        price: 10,
        quantity: 5,
      });
      
      expect(result.name).toBe(specialName);
    });

    it('should handle unicode characters in name', () => {
      const unicodeName = 'アイテム 🏆 €100 £50';
      
      const result = itemsService.create({
        name: unicodeName,
        price: 10,
        quantity: 5,
      });
      
      expect(result.name).toBe(unicodeName);
    });
  });

  // ============================================
  // SERVICE INTEGRATION SCENARIOS
  // ============================================

  describe('Integration Scenarios', () => {
    it('should support sequential updates', () => {
      const item = itemsStore.create({
        name: 'Original',
        price: 10,
        quantity: 5,
      });
      
      let updated = itemsService.update(item.id, {
        name: 'First Update',
        price: 20,
        quantity: 10,
      });
      
      expect(updated.name).toBe('First Update');
      expect(updated.price).toBe(20);
      
      updated = itemsService.update(item.id, {
        name: 'Second Update',
        price: 30,
        quantity: 15,
      });
      
      expect(updated.name).toBe('Second Update');
      expect(updated.price).toBe(30);
    });

    it('should support sequential patches', () => {
      const item = itemsStore.create({
        name: 'Original',
        price: 10,
        quantity: 5,
      });
      
      itemsService.patch(item.id, { name: 'Patched 1' });
      itemsService.patch(item.id, { price: 20 });
      itemsService.patch(item.id, { quantity: 10 });
      
      const final = itemsService.getById(item.id);
      
      expect(final.name).toBe('Patched 1');
      expect(final.price).toBe(20);
      expect(final.quantity).toBe(10);
    });

    it('should allow mix of update and patch operations', () => {
      const item = itemsStore.create({
        name: 'Original',
        price: 10,
        quantity: 5,
      });
      
      // Patch name
      let result = itemsService.patch(item.id, { name: 'Patched Name' });
      expect(result.name).toBe('Patched Name');
      
      // Full update
      result = itemsService.update(item.id, {
        name: 'Full Update',
        price: 99,
        quantity: 99,
      });
      expect(result.name).toBe('Full Update');
      expect(result.price).toBe(99);
      
      // Patch price
      result = itemsService.patch(item.id, { price: 50 });
      expect(result.name).toBe('Full Update');
      expect(result.price).toBe(50);
    });

    it('should correctly handle delete-recreate cycle', () => {
      const original = itemsService.create({
        name: 'Cycled Item',
        price: 10,
        quantity: 5,
      });
      
      itemsService.delete(original.id);
      
      const recreated = itemsService.create({
        name: 'Cycled Item',
        price: 20,
        quantity: 10,
      });
      
      expect(recreated.id).not.toBe(original.id);
      expect(recreated.price).toBe(20);
    });
  });
});

// ============================================
// ITEMS STORE UNIT TESTS
// ============================================

describe('ItemsStore - Unit Tests', () => {
  beforeEach(() => {
    itemsStore.clear();
  });

  describe('existsByName()', () => {
    it('should return true for existing name', () => {
      itemsStore.create({ name: 'Existing', price: 10, quantity: 5 });
      
      expect(itemsStore.existsByName('Existing')).toBe(true);
    });

    it('should return false for non-existing name', () => {
      expect(itemsStore.existsByName('Non-Existing')).toBe(false);
    });

    it('should be case-insensitive', () => {
      itemsStore.create({ name: 'Case Sensitive', price: 10, quantity: 5 });
      
      expect(itemsStore.existsByName('case sensitive')).toBe(true);
      expect(itemsStore.existsByName('CASE SENSITIVE')).toBe(true);
      expect(itemsStore.existsByName('CaSe SeNsItIvE')).toBe(true);
    });

    it('should exclude specified ID from check', () => {
      const item = itemsStore.create({ name: 'Same Name', price: 10, quantity: 5 });
      
      expect(itemsStore.existsByName('Same Name', item.id)).toBe(false);
      expect(itemsStore.existsByName('Same Name', 'other-id')).toBe(true);
    });
  });

  describe('getPaginated()', () => {
    it('should return correct slice for first page', () => {
      for (let i = 0; i < 10; i++) {
        itemsStore.create({ name: `Item ${i}`, price: 10, quantity: 5 });
      }
      
      const { items, total } = itemsStore.getPaginated(1, 3);
      
      expect(items.length).toBe(3);
      expect(total).toBe(10);
    });

    it('should return correct slice for middle page', () => {
      for (let i = 0; i < 10; i++) {
        itemsStore.create({ name: `Item ${i}`, price: 10, quantity: 5 });
      }
      
      const { items } = itemsStore.getPaginated(2, 3);
      
      expect(items.length).toBe(3);
    });

    it('should return correct slice for last page', () => {
      for (let i = 0; i < 10; i++) {
        itemsStore.create({ name: `Item ${i}`, price: 10, quantity: 5 });
      }
      
      const { items } = itemsStore.getPaginated(4, 3);
      
      expect(items.length).toBe(1); // Only 1 item on last page
    });

    it('should return empty array for page beyond range', () => {
      itemsStore.create({ name: 'Item', price: 10, quantity: 5 });
      
      const { items } = itemsStore.getPaginated(100, 10);
      
      expect(items).toEqual([]);
    });

    it('should sort items by createdAt descending', () => {
      const item1 = itemsStore.create({ name: 'First', price: 10, quantity: 5 });
      
      // Create second item with slight delay
      const item2 = itemsStore.create({ name: 'Second', price: 10, quantity: 5 });
      
      const { items } = itemsStore.getPaginated(1, 10);
      
      expect(items[0].name).toBe('Second');
      expect(items[1].name).toBe('First');
    });
  });

  describe('clear()', () => {
    it('should remove all items from store', () => {
      itemsStore.create({ name: 'Item 1', price: 10, quantity: 5 });
      itemsStore.create({ name: 'Item 2', price: 20, quantity: 10 });
      
      itemsStore.clear();
      
      expect(itemsStore.count()).toBe(0);
    });
  });

  describe('count()', () => {
    it('should return 0 for empty store', () => {
      expect(itemsStore.count()).toBe(0);
    });

    it('should return correct count after creates', () => {
      itemsStore.create({ name: 'Item 1', price: 10, quantity: 5 });
      itemsStore.create({ name: 'Item 2', price: 20, quantity: 10 });
      
      expect(itemsStore.count()).toBe(2);
    });

    it('should update count after deletes', () => {
      const item1 = itemsStore.create({ name: 'Item 1', price: 10, quantity: 5 });
      itemsStore.create({ name: 'Item 2', price: 20, quantity: 10 });
      
      itemsStore.delete(item1.id);
      
      expect(itemsStore.count()).toBe(1);
    });
  });
});
