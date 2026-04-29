import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { BadRequestError } from '../types';

/**
 * Validate request using express-validator
 */
export const validate = (validations: ValidationChain[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }
    
    const errorMessages = errors
      .array()
      .map(err => err.msg)
      .join(', ');
    
    next(new BadRequestError(errorMessages));
  };
};

// Common validation rules

export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .trim()
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name must contain only letters'),
  
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .trim()
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name must contain only letters'),
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const updateUserValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .trim()
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name must contain only letters'),
  
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .trim()
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name must contain only letters'),
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
];

export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'email', 'username', 'firstName', 'lastName'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

export const idParamValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
];

export const userQueryValidation = [
  ...paginationValidation,
  query('search')
    .optional()
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('Search term must be 2-100 characters'),
  
  query('role')
    .optional()
    .isIn(['USER', 'ADMIN', 'MODERATOR'])
    .withMessage('Invalid role'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('isActive must be a boolean'),
];