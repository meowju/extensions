import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ApiError, ErrorResponse } from '../types/index.js';

/**
 * Error handler middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[Error] ${err.name}: ${err.message}`);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Handle custom API errors
  if ('statusCode' in err && 'code' in err) {
    const apiError = err as ApiError;
    const errorResponse: ErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        ...(apiError.details && { details: apiError.details }),
      },
    };
    res.status(apiError.statusCode).json(errorResponse);
    return;
  }

  // Handle unknown errors
  const errorResponse: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(errorResponse);
}
