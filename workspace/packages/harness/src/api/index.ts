import express, { type Express, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { requestLogger } from './middleware/logging.js';
import { errorHandler } from './middleware/error-handler.js';
import { itemsRouter } from './routes/items.routes.js';
import { authRoutes } from './routes/auth.routes.js';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestLogger);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'rest-api'
    });
  });

  // Auth routes
  for (const [path, route] of Object.entries(authRoutes)) {
    for (const method of route.methods) {
      const handler = route.middleware 
        ? (req: Request, res: Response, next: Function) => {
            // Apply middleware chain
            let index = 0;
            const nextMiddleware = () => {
              if (index < route.middleware!.length) {
                route.middleware![index++](req, res, nextMiddleware);
              } else {
                route.handler(req, res, nextMiddleware);
              }
            };
            nextMiddleware();
          }
        : route.handler;
      
      app.use(path, (req: Request, res: Response, next: Function) => {
        if (req.method === method) {
          handler(req, res, next);
        } else {
          next();
        }
      });
    }
  }

  // API routes
  app.use('/api/v1/items', itemsRouter);

  // 404 handler for unmatched routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

// Export app instance
export const app = createApp();

// Start server if run directly
const PORT = process.env.PORT ?? 3000;

if (process.argv[1]?.endsWith('index.ts')) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📚 API docs: http://localhost:${PORT}/api/v1/items`);
    console.log(`🔐 Auth endpoints: /auth/register, /auth/login, /auth/logout, /auth/refresh-token, /auth/me`);
  });
}
