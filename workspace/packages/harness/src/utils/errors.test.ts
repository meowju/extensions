/**
 * Tests for Custom Error Classes and Result Types
 * 
 * Tests cover:
 * - AppError base class with prototype chain fixes
 * - Domain-specific error hierarchy
 * - Result type utilities (ok, err, isSuccess, isFailure)
 * - AggregateError for batch operations
 * - Serialization support
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AppError,
  DomainError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  AggregateError,
  Result,
  ok,
  err,
  isSuccess,
  isFailure,
  mapResult,
  mapError,
  unwrapOr,
  unwrap,
  unwrapError,
} from './errors.js';

describe('AppError', () => {
  it('should create error with message', () => {
    const error = new AppError('Something went wrong');
    expect(error.message).toBe('Something went wrong');
  });

  it('should have correct name property', () => {
    const error = new AppError('test');
    expect(error.name).toBe('AppError');
  });

  it('should be instanceof Error', () => {
    const error = new AppError('test');
    expect(error).toBeInstanceOf(Error);
  });

  it('should be instanceof AppError', () => {
    const error = new AppError('test');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should have default code and statusCode', () => {
    const error = new AppError('test');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
  });

  it('should accept custom code and statusCode', () => {
    const error = new AppError('test', {
      code: 'CUSTOM_CODE',
      statusCode: 418,
    });
    expect(error.code).toBe('CUSTOM_CODE');
    expect(error.statusCode).toBe(418);
  });

  it('should include context data', () => {
    const error = new AppError('test', {
      context: { userId: '123', action: 'login' },
    });
    expect(error.context).toEqual({ userId: '123', action: 'login' });
  });

  it('should have timestamp', () => {
    const before = Date.now();
    const error = new AppError('test');
    const after = Date.now();
    expect(error.timestamp).toBeGreaterThanOrEqual(before);
    expect(error.timestamp).toBeLessThanOrEqual(after);
  });

  it('should have stack trace', () => {
    const error = new AppError('test');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });

  it('should support isCode method', () => {
    const error = new AppError('test', { code: 'TEST_CODE' });
    expect(error.isCode('TEST_CODE')).toBe(true);
    expect(error.isCode('OTHER_CODE')).toBe(false);
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new AppError('test error', {
        code: 'TEST_CODE',
        statusCode: 400,
        context: { field: 'email' },
      });
      
      const json = error.toJSON();
      
      expect(json.name).toBe('AppError');
      expect(json.message).toBe('test error');
      expect(json.code).toBe('TEST_CODE');
      expect(json.statusCode).toBe(400);
      expect(json.context).toEqual({ field: 'email' });
      expect(json.stack).toBeDefined();
      expect(json.timestamp).toBe(error.timestamp);
    });
  });
});

describe('Domain-specific Errors', () => {
  describe('ValidationError', () => {
    it('should have correct code and statusCode', () => {
      const error = new ValidationError('Invalid email');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('should include field information', () => {
      const error = new ValidationError('Email is required', {
        field: 'email',
        value: undefined,
      });
      expect(error.field).toBe('email');
      expect(error.value).toBeUndefined();
      expect(error.context?.field).toBe('email');
    });

    it('should be instanceof DomainError', () => {
      const error = new ValidationError('test');
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('NotFoundError', () => {
    it('should create error with resource and id', () => {
      const error = new NotFoundError('User', '123');
      expect(error.message).toBe("User with id '123' not found");
      expect(error.resource).toBe('User');
      expect(error.resourceId).toBe('123');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('should create error without id', () => {
      const error = new NotFoundError('Session');
      expect(error.message).toBe('Session not found');
      expect(error.resource).toBe('Session');
      expect(error.resourceId).toBeUndefined();
    });
  });

  describe('UnauthorizedError', () => {
    it('should have default message', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('Authentication required');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Token expired');
      expect(error.message).toBe('Token expired');
    });
  });

  describe('ForbiddenError', () => {
    it('should have correct defaults', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Permission denied');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('ConflictError', () => {
    it('should include conflicting resource', () => {
      const error = new ConflictError('Email already in use', 'user@example.com');
      expect(error.message).toBe('Email already in use');
      expect(error.code).toBe('CONFLICT');
      expect(error.statusCode).toBe(409);
      expect(error.conflictingResource).toBe('user@example.com');
    });
  });

  describe('RateLimitError', () => {
    it('should include retry information', () => {
      const error = new RateLimitError('Too many requests', 60000);
      expect(error.message).toBe('Too many requests');
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.statusCode).toBe(429);
      expect(error.retryAfterMs).toBe(60000);
    });
  });
});

describe('AggregateError', () => {
  it('should collect multiple errors', () => {
    const errors = [
      new ValidationError('Field 1 is invalid'),
      new ValidationError('Field 2 is invalid'),
      new NotFoundError('RelatedResource', '456'),
    ];
    
    const aggregate = new AggregateError(errors);
    
    expect(aggregate.errors).toHaveLength(3);
    expect(aggregate.message).toBe('Encountered 3 error(s)');
  });

  it('should accept custom message', () => {
    const aggregate = new AggregateError([], 'Batch operation failed');
    expect(aggregate.message).toBe('Batch operation failed');
  });

  it('should be iterable', () => {
    const errors = [
      new AppError('Error 1'),
      new AppError('Error 2'),
    ];
    const aggregate = new AggregateError(errors);
    
    const collected: Error[] = [];
    for (const error of aggregate) {
      collected.push(error);
    }
    
    expect(collected).toHaveLength(2);
  });

  it('should support filter', () => {
    const errors = [
      new ValidationError('Invalid'),
      new NotFoundError('Resource', '1'),
      new ValidationError('Also invalid'),
    ];
    const aggregate = new AggregateError(errors);
    
    const validationErrors = aggregate.filter(
      (e) => e instanceof ValidationError
    );
    
    expect(validationErrors).toHaveLength(2);
  });

  it('should support some', () => {
    const errors = [
      new AppError('Error 1'),
      new NotFoundError('X', '1'),
    ];
    const aggregate = new AggregateError(errors);
    
    expect(aggregate.some((e) => e instanceof NotFoundError)).toBe(true);
    expect(aggregate.some((e) => e instanceof ValidationError)).toBe(false);
  });

  it('should freeze errors array', () => {
    const errors = [new AppError('test')];
    const aggregate = new AggregateError(errors);
    
    expect(() => {
      (aggregate.errors as Error[]).push(new AppError('another'));
    }).toThrow();
  });
});

describe('Result Type', () => {
  describe('ok()', () => {
    it('should create success result', () => {
      const result = ok(42);
      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });
  });

  describe('err()', () => {
    it('should create failure result', () => {
      const error = new AppError('Failed');
      const result = err(error);
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('isSuccess()', () => {
    it('should narrow to success type', () => {
      const result = ok(42);
      if (isSuccess(result)) {
        expect(result.data).toBe(42);
      }
    });

    it('should return false for failure', () => {
      expect(isSuccess(err(new AppError('fail')))).toBe(false);
    });
  });

  describe('isFailure()', () => {
    it('should narrow to failure type', () => {
      const error = new AppError('Failed');
      const result = err(error);
      if (isFailure(result)) {
        expect(result.error).toBe(error);
      }
    });

    it('should return false for success', () => {
      expect(isFailure(ok(42))).toBe(false);
    });
  });

  describe('mapResult()', () => {
    it('should transform success value', () => {
      const result = ok(5);
      const mapped = mapResult(result, (n) => n * 2);
      expect(mapped.success).toBe(true);
      expect((mapped as { data: number }).data).toBe(10);
    });

    it('should pass through failure', () => {
      const error = new AppError('fail');
      const result = err(error);
      const mapped = mapResult(result, (n: number) => n * 2);
      expect(mapped.success).toBe(false);
      expect((mapped as { error: AppError }).error).toBe(error);
    });
  });

  describe('mapError()', () => {
    it('should transform error', () => {
      const original = new AppError('original');
      const result = err(original);
      const mapped = mapError(result, (e) => new ValidationError(e.message));
      
      expect(mapped.success).toBe(false);
      const mappedResult = mapped as { error: ValidationError };
      expect(mappedResult.error).toBeInstanceOf(ValidationError);
    });

    it('should pass through success', () => {
      const result = ok(42);
      const mapped = mapError(result, (e) => new AppError('never'));
      expect(mapped.success).toBe(true);
      expect((mapped as { data: number }).data).toBe(42);
    });
  });

  describe('unwrapOr()', () => {
    it('should return data for success', () => {
      const result = ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('should return default for failure', () => {
      const result = err(new AppError('fail'));
      expect(unwrapOr(result, 100)).toBe(100);
    });
  });

  describe('unwrap()', () => {
    it('should return data for success', () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it('should throw error for failure', () => {
      const error = new AppError('fail');
      const result = err(error);
      expect(() => unwrap(result)).toThrow(error);
    });
  });

  describe('unwrapError()', () => {
    it('should return error for failure', () => {
      const error = new AppError('fail');
      const result = err(error);
      expect(unwrapError(result)).toBe(error);
    });

    it('should throw for success', () => {
      const result = ok(42);
      expect(() => unwrapError(result)).toThrow('Expected failure but got success');
    });
  });
});

describe('Real-world Usage Pattern', () => {
  // Simulate a function that might fail
  function divide(a: number, b: number): Result<number, AppError> {
    if (b === 0) {
      return err(new AppError('Division by zero', {
        code: 'ARITHMETIC_ERROR',
        context: { dividend: a, divisor: b },
      }));
    }
    return ok(a / b);
  }

  function findUser(id: string): Result<{ id: string; name: string }, NotFoundError> {
    if (id === '404') {
      return err(new NotFoundError('User', id));
    }
    return ok({ id, name: 'John Doe' });
  }

  it('should handle successful division', () => {
    const result = divide(10, 2);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data).toBe(5);
    }
  });

  it('should handle division by zero', () => {
    const result = divide(10, 0);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('ARITHMETIC_ERROR');
      expect(result.error.context?.dividend).toBe(10);
    }
  });

  it('should handle user not found', () => {
    const result = findUser('404');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.resource).toBe('User');
    }
  });

  it('should chain operations with mapResult', () => {
    const result = divide(20, 2);
    const mapped = mapResult(result, (n) => n * 3);
    expect(isSuccess(mapped)).toBe(true);
    if (isSuccess(mapped)) {
      expect(mapped.data).toBe(30);
    }
  });
});
