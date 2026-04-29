/**
 * Validation Middleware
 * 
 * Provides reusable validation patterns for request data
 */

import { ZodSchema, ZodError } from 'zod';
import type { ErrorResponse } from '../types/index.js';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: Request): Promise<{ success: true; data: T } | { success: false; response: Response }> => {
    try {
      const body = await request.json();
      const parsed = schema.safeParse(body);

      if (!parsed.success) {
        const response = createValidationErrorResponse(parsed.error);
        return { success: false, response };
      }

      return { success: true, data: parsed.data };
    } catch (error) {
      // Handle non-JSON requests
      if (error instanceof SyntaxError) {
        const response = Response.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid JSON in request body',
            },
          } as ErrorResponse,
          { status: 400, headers: jsonHeaders }
        );
        return { success: false, response };
      }
      throw error;
    }
  };
}

/**
 * Validate URL parameters against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (params: Record<string, string>): { success: true; data: T } | { success: false; response: Response } => {
    const parsed = schema.safeParse(params);

    if (!parsed.success) {
      const response = createValidationErrorResponse(parsed.error);
      return { success: false, response };
    }

    return { success: true, data: parsed.data };
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (searchParams: URLSearchParams): { success: true; data: T } | { success: false; response: Response } => {
    const query: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const parsed = schema.safeParse(query);

    if (!parsed.success) {
      const response = createValidationErrorResponse(parsed.error);
      return { success: false, response };
    }

    return { success: true, data: parsed.data };
  };
}

/**
 * Create a standardized validation error response
 */
function createValidationErrorResponse(error: ZodError): Response {
  const details: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.') || 'unknown';
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(err.message);
  });

  return Response.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details,
      },
    } as ErrorResponse,
    { status: 400, headers: jsonHeaders }
  );
}