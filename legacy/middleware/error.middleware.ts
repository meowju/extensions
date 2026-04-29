import { Request, Response, NextFunction } from 'express';
import { AppError, ApiResponse } from '../types';
import { config } from '../config';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  // Log error in development
  if (config.isDevelopment) {
    console.error('Error:', err);
  }
  
  // Handle known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }
  
  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'A record with this value already exists',
      });
      return;
    }
    
    // Foreign key constraint
    if (prismaError.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: 'Invalid reference provided',
      });
      return;
    }
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
    return;
  }
  
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token has expired',
    });
    return;
  }
  
  // Default server error
  res.status(500).json({
    success: false,
    error: config.isDevelopment ? err.message : 'Internal server error',
  });
};

/**
 * Not found handler - catches 404 errors
 */
export const notFoundHandler = (
  req: Request,
  res: Response<ApiResponse>
): void => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.path}`,
  });
};

/**
 * Async handler wrapper - catches errors in async route handlers
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};