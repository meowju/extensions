// Export all auth types
export * from './types/auth.types.js';

// Export services
export * from './services/hash.service.js';
export * from './services/jwt.service.js';
export * from './services/user.service.js';

// Export controllers
export * from './controllers/auth.controller.js';

// Export middleware
export * from './middleware/auth.middleware.js';

// Export routes
export * from './routes/auth.routes.js';
export * from './routes/user.routes.js';

// Export express type augmentation
declare global {
  namespace Express {
    interface Request {
      user?: import('./types/auth.types.js').UserPublic;
      tokenPayload?: import('./types/auth.types.js').TokenPayload;
    }
  }
}