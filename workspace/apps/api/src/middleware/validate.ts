import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

type ValidateBody = (schema: ZodSchema) => (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

type ValidateParams = (schema: ZodSchema) => (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

type ValidateQuery = (schema: ZodSchema) => (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

const handleZodError = (error: z.ZodError): { code: string; message: string } => {
  const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
  return {
    code: 'VALIDATION_ERROR',
    message: issues.join('; '),
  };
};

export const validateBody: ValidateBody = (schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: handleZodError(error),
        });
        return;
      }
      next(error);
    }
  };
};

export const validateParams: ValidateParams = (schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: handleZodError(error),
        });
        return;
      }
      next(error);
    }
  };
};

export const validateQuery: ValidateQuery = (schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: handleZodError(error),
        });
        return;
      }
      next(error);
    }
  };
};

// Common validation schemas
export const schemas = {
  register: z.object({
    username: z.string().min(3).max(30),
    email: z.string().email(),
    password: z.string().min(8),
  }),

  login: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),

  updateUser: z.object({
    username: z.string().min(3).max(30).optional(),
    email: z.string().email().optional(),
    role: z.enum(['user', 'admin']).optional(),
  }),

  createNote: z.object({
    title: z.string().min(1).max(200),
    content: z.string(),
  }),

  updateNote: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().optional(),
  }),

  idParam: z.object({
    id: z.string().min(1),
  }),
};
