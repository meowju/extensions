/**
 * Express Server Configuration
 * Main application entry point with middleware, routes, and error handling
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { getConfig } from './config/index.js';
import { logger, RequestLogger } from './logger/index.js';
import { validate, ValidationError } from './validators/index.js';
import { paginationSchema, idParamSchema } from './validators/index.js';
import { authRouter, createAuthRouter } from './auth/routes/auth.routes.js';
import { userRouter, createUserRouter } from './auth/routes/user.routes.js';
import { authErrorHandler } from './auth/middleware/auth.middleware.js';
import { v4 as uuidv4 } from 'uuid';

// Import database
import { getDatabase, closeDatabase } from './database/connection.js';

// ============ Middleware ============

/**
 * Request ID middleware - adds unique ID to each request
 */
function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
}

/**
 * Request logging middleware
 */
function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] as string;
  const requestLogger = logger.withRequest(requestId);

  // Log request
  requestLogger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    requestLogger[level](`${req.method} ${req.path} ${res.statusCode}`, {
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
}

/**
 * Error handling middleware
 */
function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string;
  const requestLogger = logger.withRequest(requestId);

  // Log the error
  if (err instanceof ValidationError) {
    requestLogger.warn('Validation error', { errors: err.errors });
    res.status(400).json({
      success: false,
      message: err.message,
      errors: err.errors,
      requestId,
    });
    return;
  }

  // Handle known error types
  if (err.name === 'UnauthorizedError' || err.message.includes('token')) {
    requestLogger.warn('Authentication error', { message: err.message });
    res.status(401).json({
      success: false,
      message: err.message || 'Authentication required',
      requestId,
    });
    return;
  }

  if (err.name === 'NotFoundError' || err.message.includes('not found')) {
    requestLogger.warn('Not found error', { message: err.message });
    res.status(404).json({
      success: false,
      message: err.message || 'Resource not found',
      requestId,
    });
    return;
  }

  // Unknown errors
  requestLogger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    requestId,
    ...(getConfig().NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 handler
 */
function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.headers['x-request-id'],
  });
}

// ============ Health Check ============

function createHealthRouter(): express.Router {
  const router = express.Router();

  router.get('/health', async (req: Request, res: Response) => {
    try {
      const db = await getDatabase();
      const dbHealthy = await db.ping();

      res.json({
        status: dbHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealthy ? 'connected' : 'disconnected',
        },
        version: process.env.npm_package_version || '1.0.0',
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      });
    }
  });

  router.get('/health/ready', async (req: Request, res: Response) => {
    try {
      const db = await getDatabase();
      const dbHealthy = await db.ping();

      if (dbHealthy) {
        res.json({ ready: true });
      } else {
        res.status(503).json({ ready: false, reason: 'Database not connected' });
      }
    } catch (error) {
      res.status(503).json({ ready: false, reason: (error as Error).message });
    }
  });

  return router;
}

// ============ Main App Factory ============

export interface AppOptions {
  skipDatabase?: boolean;
}

export async function createApp(options: AppOptions = {}): Promise<Express> {
  const config = getConfig();
  const log = logger.child('app');

  log.info('Creating Express application', {
    env: config.NODE_ENV,
    port: config.PORT,
  });

  // Initialize database if not skipped
  if (!options.skipDatabase) {
    await getDatabase();
    log.info('Database initialized');
  }

  // Create Express app
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // ============ Middleware Stack ============

  // Request ID
  app.use(requestIdMiddleware);

  // Request logging
  app.use(requestLoggingMiddleware);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS (if configured)
  if (config.CORS_ORIGINS) {
    const cors = (await import('cors')).default;
    app.use(cors({
      origin: config.CORS_ORIGINS.split(',').map(s => s.trim()),
      credentials: true,
    }));
  }

  // ============ Routes ============

  // Health checks (no auth required)
  app.use(createHealthRouter());

  // Auth routes
  app.use('/auth', createAuthRouter());

  // User routes (with auth)
  app.use('/users', createUserRouter());

  // ============ Error Handling ============

  // Auth error handler
  app.use(authErrorHandler);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(globalErrorHandler);

  return app;
}

// ============ Server Lifecycle ============

let server: ReturnType<Express['listen']> | null = null;

export async function startServer(): Promise<Express> {
  const config = getConfig();
  const log = logger.child('server');

  const app = await createApp();

  return new Promise((resolve, reject) => {
    server = app.listen(config.PORT, () => {
      log.info(`Server started on port ${config.PORT}`, {
        env: config.NODE_ENV,
        port: config.PORT,
        apiUrl: config.API_BASE_URL,
      });

      printBanner(config);
      resolve(app);
    });

    server.on('error', (err) => {
      log.error('Server failed to start', err);
      reject(err);
    });
  });
}

export async function stopServer(): Promise<void> {
  const log = logger.child('server');

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => {
        if (err) {
          log.error('Error closing server', err);
          reject(err);
        } else {
          log.info('Server closed gracefully');
          resolve();
        }
      });
    });
  }

  await closeDatabase();
  log.info('All connections closed');
}

function printBanner(config: ReturnType<typeof getConfig>): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    ${config.npm_package_name || 'Auth API Server'}                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${config.PORT}                       ║
║  Environment: ${config.NODE_ENV.padEnd(42)}║
║                                                               ║
║  Endpoints:                                                   ║
║    GET  /health           - Health check                      ║
║    GET  /health/ready    - Readiness check                    ║
║    POST /auth/register    - Create new user                   ║
║    POST /auth/login       - Authenticate user                 ║
║    POST /auth/refresh     - Refresh access token              ║
║    POST /auth/logout      - Logout current session            ║
║    POST /auth/logout-all  - Logout all sessions                ║
║    GET  /users/me         - Get current user (protected)      ║
║    PUT  /users/me         - Update profile (protected)        ║
║    DELETE /users/me       - Delete account (protected)       ║
║                                                               ║
║  Configuration:                                               ║
║    JWT Access Expiry: ${String(config.JWT_ACCESS_EXPIRY).padEnd(40)}║
║    JWT Refresh Expiry: ${String(config.JWT_REFRESH_EXPIRY / 86400).padEnd(40)}║
║    Rate Limit: ${String(`${config.RATE_LIMIT_MAX} requests/${config.RATE_LIMIT_WINDOW / 1000}s`).padEnd(53)}║
║    Log Level: ${config.LOG_LEVEL.padEnd(55)}║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

// Export for testing
export { requestIdMiddleware, requestLoggingMiddleware, globalErrorHandler, notFoundHandler };
