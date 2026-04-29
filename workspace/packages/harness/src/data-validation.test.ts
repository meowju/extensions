/**
 * Tests for Data Validation Utility
 * 
 * Tests cover:
 * - Result type factory functions
 * - Validation rules (required, minLength, maxLength, pattern, email, range)
 * - Schema validation with compose
 * - Error handling and serialization
 * - Type guard functions
 * - Exhaustive error handling
 */

import { describe, it, expect } from 'vitest';
import {
  // Result types
  ok,
  err,
  isOk,
  isErr,
  tryCatch,
  tryCatchAsync,
  Success,
  Failure,
  // Validation rules
  required,
  minLength,
  maxLength,
  pattern,
  email,
  range,
  compose,
  validate,
  // Error types
  ValidationError,
  AggregateValidationError,
  AppError,
  // Utilities
  parseUserRegistration,
  prepareUserForStorage,
  userRegistrationSchema,
  isAppError,
  isValidationError,
  isAggregateValidationError,
  serializeError,
  getErrorMessage,
} from './data-validation';

describe('Result Type', () => {
  describe('ok() - Success factory', () => {
    it('should create a success result with data', () => {
      const result = ok({ name: 'Alice' });
      
      expect(result.success).toBe(true);
      expect(result.failure).toBe(false);
      if (isOk(result)) {
        expect(result.data).toEqual({ name: 'Alice' });
      }
    });

    it('should support map transformation', () => {
      const result = ok(5)
        .map(x => x * 2)
        .map(x => x + 1);
      
      expect(result).toBeInstanceOf(Success);
      if (isOk(result)) {
        expect(result.data).toBe(11);
      }
    });

    it('should support andThen chaining', () => {
      const result = ok(10).andThen(x => ok(x / 2));
      
      expect(result).toBeInstanceOf(Success);
      if (isOk(result)) {
        expect(result.data).toBe(5);
      }
    });

    it('should return same result on mapError', () => {
      const result = ok('test').mapError(() => new Error('ignored'));
      
      expect(result).toBeInstanceOf(Success);
      if (isOk(result)) {
        expect(result.data).toBe('test');
      }
    });
  });

  describe('err() - Failure factory', () => {
    it('should create a failure result with error', () => {
      const error = new Error('Something went wrong');
      const result = err(error);
      
      expect(result.success).toBe(false);
      expect(result.failure).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe(error);
      }
    });

    it('should not transform on map', () => {
      const error = new Error('test');
      const result = err(error).map(x => x * 2);
      
      expect(result).toBeInstanceOf(Failure);
    });

    it('should transform error on mapError', () => {
      const originalError = new ValidationError('Invalid');
      const result = err(originalError).mapError(
        () => new Error('Transformed')
      );
      
      expect(result).toBeInstanceOf(Failure);
      if (isErr(result)) {
        expect((result.error as Error).message).toBe('Transformed');
      }
    });
  });

  describe('type guards', () => {
    it('isOk should narrow to Success type', () => {
      const result = ok(42);
      
      if (isOk(result)) {
        // TypeScript knows result is Success here
        expect(result.data).toBe(42);
      }
    });

    it('isErr should narrow to Failure type', () => {
      const result = err(new Error('fail'));
      
      if (isErr(result)) {
        expect(result.error.message).toBe('fail');
      }
    });
  });

  describe('fold - pattern matching', () => {
    it('should call onSuccess for ok results', () => {
      const result = ok(5).fold(
        value => `Got: ${value}`,
        error => `Error: ${error}`
      );
      
      expect(result).toBe('Got: 5');
    });

    it('should call onFailure for err results', () => {
      const result = err(new Error('oops')).fold(
        value => `Got: ${value}`,
        error => `Error: ${error.message}`
      );
      
      expect(result).toBe('Error: oops');
    });
  });

  describe('getOrElse', () => {
    it('should return value for success', () => {
      const result = ok(42).getOrElse(0);
      expect(result).toBe(42);
    });

    it('should return default for failure', () => {
      const result = err(new Error('fail')).getOrElse(0);
      expect(result).toBe(0);
    });
  });
});

describe('tryCatch()', () => {
  it('should return success when function succeeds', () => {
    const result = tryCatch(() => 42);
    
    expect(result).toBeInstanceOf(Success);
    if (isOk(result)) {
      expect(result.data).toBe(42);
    }
  });

  it('should return failure when function throws', () => {
    const result = tryCatch(() => {
      throw new Error('Oops');
    });
    
    expect(result).toBeInstanceOf(Failure);
    if (isErr(result)) {
      expect(result.error.message).toBe('Oops');
    }
  });

  it('should use custom error mapper', () => {
    const result = tryCatch(
      () => { throw new TypeError('bad type'); },
      (error) => new ValidationError(`Custom: ${error instanceof TypeError ? error.message : 'unknown'}`)
    );
    
    expect(result).toBeInstanceOf(Failure);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect((result.error as ValidationError).message).toContain('Custom');
    }
  });
});

describe('tryCatchAsync()', () => {
  it('should return success when promise resolves', async () => {
    const result = await tryCatchAsync(Promise.resolve(42));
    
    expect(result).toBeInstanceOf(Success);
    if (isOk(result)) {
      expect(result.data).toBe(42);
    }
  });

  it('should return failure when promise rejects', async () => {
    const result = await tryCatchAsync(
      Promise.reject(new Error('Async error'))
    );
    
    expect(result).toBeInstanceOf(Failure);
    if (isErr(result)) {
      expect(result.error.message).toBe('Async error');
    }
  });
});

describe('Validation Rules', () => {
  describe('required()', () => {
    it('should pass for non-empty values', () => {
      const result = required('email')('test@example.com');
      
      expect(result).toBeInstanceOf(Success);
    });

    it('should fail for null', () => {
      const result = required('email')(null);
      
      expect(result).toBeInstanceOf(Failure);
      if (isErr(result)) {
        expect(result.error.message).toBe('email is required');
      }
    });

    it('should fail for undefined', () => {
      const result = required('email')(undefined);
      
      expect(result).toBeInstanceOf(Failure);
    });

    it('should fail for empty string', () => {
      const result = required('email')('');
      
      expect(result).toBeInstanceOf(Failure);
    });
  });

  describe('minLength()', () => {
    it('should pass for valid length', () => {
      const result = minLength('password', 8)('password123');
      
      expect(result).toBeInstanceOf(Success);
    });

    it('should fail for too short string', () => {
      const result = minLength('password', 8)('short');
      
      expect(result).toBeInstanceOf(Failure);
      if (isErr(result)) {
        expect(result.error.message).toContain('at least 8 characters');
      }
    });

    it('should fail for non-string', () => {
      const result = minLength('password', 8)(12345 as unknown as string);
      
      expect(result).toBeInstanceOf(Failure);
    });
  });

  describe('maxLength()', () => {
    it('should pass for valid length', () => {
      const result = maxLength('username', 20)('validuser');
      
      expect(result).toBeInstanceOf(Success);
    });

    it('should fail for too long string', () => {
      const result = maxLength('username', 10)('thisisavalidusername');
      
      expect(result).toBeInstanceOf(Failure);
      if (isErr(result)) {
        expect(result.error.message).toContain('at most 10 characters');
      }
    });
  });

  describe('pattern()', () => {
    it('should pass for matching pattern', () => {
      const result = pattern('code', /^[A-Z]{3}-\d{4}$/, 'code')('ABC-1234');
      
      expect(result).toBeInstanceOf(Success);
    });

    it('should fail for non-matching pattern', () => {
      const result = pattern('code', /^[A-Z]{3}-\d{4}$/, 'code')('invalid');
      
      expect(result).toBeInstanceOf(Failure);
    });
  });

  describe('email()', () => {
    it('should pass for valid email', () => {
      const result = email('email')('user@example.com');
      
      expect(result).toBeInstanceOf(Success);
    });

    it('should fail for invalid email', () => {
      const result = email('email')('not-an-email');
      
      expect(result).toBeInstanceOf(Failure);
      if (isErr(result)) {
        expect(result.error.message).toContain('email address');
      }
    });
  });

  describe('range()', () => {
    it('should pass for value in range', () => {
      const result = range('age', 18, 120)(25);
      
      expect(result).toBeInstanceOf(Success);
    });

    it('should fail for value below range', () => {
      const result = range('age', 18, 120)(15);
      
      expect(result).toBeInstanceOf(Failure);
    });

    it('should fail for value above range', () => {
      const result = range('age', 18, 120)(150);
      
      expect(result).toBeInstanceOf(Failure);
    });
  });

  describe('compose()', () => {
    it('should combine multiple rules', () => {
      const validateUsername = compose(
        required('username'),
        minLength('username', 3),
        maxLength('username', 20)
      );

      const result = validateUsername('alice');
      
      expect(result).toBeInstanceOf(Success);
    });

    it('should stop at first failure', () => {
      const validateUsername = compose(
        required('username'),
        minLength('username', 5)
      );

      const result = validateUsername('ab');
      
      expect(result).toBeInstanceOf(Failure);
      if (isErr(result)) {
        expect(result.error.message).toContain('at least 5 characters');
      }
    });
  });
});

describe('validate() - Object Schema Validation', () => {
  it('should validate correct data', () => {
    const data = {
      name: 'Alice',
      age: 25,
    };

    const result = validate(data, {
      name: required('name'),
      age: compose(required('age'), range('age', 0, 150)),
    });

    expect(result).toBeInstanceOf(Success);
    if (isOk(result)) {
      expect(result.data).toEqual({ name: 'Alice', age: 25 });
    }
  });

  it('should return aggregate error for multiple failures', () => {
    const data = {
      name: '',
      email: 'invalid',
    };

    const result = validate(data, {
      name: required('name'),
      email: email('email'),
    });

    expect(result).toBeInstanceOf(Failure);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AggregateValidationError);
      expect(result.error.errors.length).toBe(2);
    }
  });

  it('should fail for non-object data', () => {
    const result = validate('string', {
      name: required('name'),
    });

    expect(result).toBeInstanceOf(Failure);
  });
});

describe('parseUserRegistration()', () => {
  it('should validate correct user data', () => {
    const userData = {
      email: 'alice@example.com',
      password: 'securePassword123',
      username: 'alice_123',
      age: 25,
    };

    const result = parseUserRegistration(userData);

    expect(result).toBeInstanceOf(Success);
    if (isOk(result)) {
      expect(result.data.email).toBe('alice@example.com');
      expect(result.data.username).toBe('alice_123');
      expect(result.data.age).toBe(25);
    }
  });

  it('should pass without optional age', () => {
    const userData = {
      email: 'alice@example.com',
      password: 'securePassword123',
      username: 'alice_123',
    };

    const result = parseUserRegistration(userData);

    expect(result).toBeInstanceOf(Success);
  });

  it('should fail for missing required fields', () => {
    const userData = {
      email: 'alice@example.com',
      // missing password and username
    };

    const result = parseUserRegistration(userData);

    expect(result).toBeInstanceOf(Failure);
    if (isErr(result)) {
      expect(result.error.errors.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('should fail for invalid email', () => {
    const userData = {
      email: 'not-an-email',
      password: 'securePassword123',
      username: 'alice_123',
    };

    const result = parseUserRegistration(userData);

    expect(result).toBeInstanceOf(Failure);
  });

  it('should fail for weak password', () => {
    const userData = {
      email: 'alice@example.com',
      password: 'short',
      username: 'alice_123',
    };

    const result = parseUserRegistration(userData);

    expect(result).toBeInstanceOf(Failure);
  });

  it('should fail for invalid username characters', () => {
    const userData = {
      email: 'alice@example.com',
      password: 'securePassword123',
      username: 'alice@123!',
    };

    const result = parseUserRegistration(userData);

    expect(result).toBeInstanceOf(Failure);
  });

  it('should fail for age below minimum', () => {
    const userData = {
      email: 'alice@example.com',
      password: 'securePassword123',
      username: 'alice_123',
      age: 10,
    };

    const result = parseUserRegistration(userData);

    expect(result).toBeInstanceOf(Failure);
  });
});

describe('prepareUserForStorage()', () => {
  it('should sanitize and prepare validated data', () => {
    const validatedData = {
      email: '  ALICE@Example.COM  ',
      password: 'password123',
      username: '  Alice_123  ',
      age: 25,
    };

    const result = prepareUserForStorage(validatedData);

    expect(result).toBeInstanceOf(Success);
    if (isOk(result)) {
      expect(result.data.email).toBe('alice@example.com');
      expect(result.data.username).toBe('alice_123');
      expect(result.data.age).toBe(25);
      expect(result.data.hashedPassword).toBeDefined();
      expect(result.data.createdAt).toBeInstanceOf(Date);
    }
  });

  it('should handle optional age', () => {
    const validatedData = {
      email: 'alice@example.com',
      password: 'password123',
      username: 'alice_123',
    };

    const result = prepareUserForStorage(validatedData);

    expect(result).toBeInstanceOf(Success);
    if (isOk(result)) {
      expect(result.data.age).toBeUndefined();
    }
  });
});

describe('Error Types', () => {
  describe('ValidationError', () => {
    it('should have correct structure', () => {
      const error = new ValidationError('Invalid email', {
        field: 'email',
        value: 'bad',
        constraints: ['valid-email'],
      });

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid email');
      expect(error.context.field).toBe('email');
      expect(error.context.value).toBe('bad');
      expect(error.context.constraints).toEqual(['valid-email']);
    });

    it('should get field errors', () => {
      const error = new ValidationError('Email is invalid', { field: 'email' });
      const fieldErrors = error.getFieldErrors();

      expect(fieldErrors).toEqual({ email: ['Email is invalid'] });
    });
  });

  describe('AggregateValidationError', () => {
    it('should collect multiple errors', () => {
      const errors = [
        new ValidationError('Email required', { field: 'email' }),
        new ValidationError('Password too short', { field: 'password' }),
      ];

      const error = new AggregateValidationError(
        'Validation failed for 2 field(s)',
        errors
      );

      expect(error.code).toBe('AGGREGATE_VALIDATION_ERROR');
      expect(error.errors).toHaveLength(2);
    });

    it('should get all field errors', () => {
      const errors = [
        new ValidationError('Email required', { field: 'email' }),
        new ValidationError('Password too short', { field: 'password' }),
      ];

      const error = new AggregateValidationError('Failed', errors);
      const fieldErrors = error.getFieldErrors();

      expect(fieldErrors).toEqual({
        email: ['Email required'],
        password: ['Password too short'],
      });
    });
  });

  describe('serializeError()', () => {
    it('should serialize AppError correctly', () => {
      const error = new ValidationError('Test error', { field: 'test' });
      const serialized = serializeError(error);

      expect(serialized).toHaveProperty('name', 'ValidationError');
      expect(serialized).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(serialized).toHaveProperty('message', 'Test error');
      expect(serialized).toHaveProperty('statusCode', 400);
    });

    it('should serialize standard Error correctly', () => {
      const error = new Error('Standard error');
      const serialized = serializeError(error);

      expect(serialized).toHaveProperty('name', 'Error');
      expect(serialized).toHaveProperty('message', 'Standard error');
    });

    it('should serialize unknown as string', () => {
      const serialized = serializeError(null);
      expect(serialized).toHaveProperty('message', 'null');
    });
  });
});

describe('Type Guards', () => {
  it('isAppError should identify AppError instances', () => {
    const appError = new ValidationError('Test', { field: 'test' });
    const standardError = new Error('Test');

    expect(isAppError(appError)).toBe(true);
    expect(isAppError(standardError)).toBe(false);
  });

  it('isValidationError should identify ValidationError instances', () => {
    const validationError = new ValidationError('Test', { field: 'test' });
    const otherError = new AppError('Test', { code: 'TEST', statusCode: 500 }) as unknown as AppError;

    expect(isValidationError(validationError)).toBe(true);
    expect(isValidationError(otherError)).toBe(false);
  });

  it('isAggregateValidationError should identify aggregate errors', () => {
    const aggregateError = new AggregateValidationError('Failed', []);
    const validationError = new ValidationError('Test', { field: 'test' });

    expect(isAggregateValidationError(aggregateError)).toBe(true);
    expect(isAggregateValidationError(validationError)).toBe(false);
  });
});

describe('getErrorMessage() - Exhaustive Error Handling', () => {
  it('should handle VALIDATION_ERROR', () => {
    const error = new ValidationError('Invalid input', { field: 'name' });
    const message = getErrorMessage(error);

    expect(message).toContain('Invalid input');
  });

  it('should handle AGGREGATE_VALIDATION_ERROR', () => {
    const error = new AggregateValidationError('Multiple errors', [
      new ValidationError('Error 1', { field: 'a' }),
      new ValidationError('Error 2', { field: 'b' }),
    ]);
    const message = getErrorMessage(error);

    expect(message).toContain('Error 1');
    expect(message).toContain('Error 2');
  });
});

describe('Real-world Usage Pattern', () => {
  it('should demonstrate railway-oriented programming', async () => {
    // Simulate: parse -> validate -> prepare -> save
    const rawData = {
      email: 'user@example.com', // Clean email (validation doesn't trim)
      password: 'securePass123',
      username: 'new_user',
      age: 30,
    };

    // Step 1: Parse and validate
    const parsed = parseUserRegistration(rawData);
    
    // Step 2: Prepare for storage (only if valid)
    const prepared = parsed.andThen(prepareUserForStorage);

    // Step 3: Handle result
    const finalResult = prepared.fold(
      (data) => {
        // In production, this would save to database
        return ok({ ...data, id: 'generated-id' });
      },
      (error) => {
        // Handle validation errors
        return err(error);
      }
    );

    expect(finalResult).toBeInstanceOf(Success);
    if (isOk(finalResult)) {
      expect(finalResult.data.email).toBe('user@example.com');
      expect(finalResult.data.username).toBe('new_user');
    }
  });

  it('should fail early on invalid data', () => {
    const rawData = {
      email: 'invalid-email',
      password: 'weak',
      username: 'ab', // too short
    };

    const result = parseUserRegistration(rawData)
      .andThen(prepareUserForStorage)
      .fold(
        (data) => ok(data),
        (error) => err(error)
      );

    expect(result).toBeInstanceOf(Failure);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AggregateValidationError);
      // Should have multiple errors
      expect((result.error as AggregateValidationError).errors.length).toBeGreaterThan(1);
    }
  });
});