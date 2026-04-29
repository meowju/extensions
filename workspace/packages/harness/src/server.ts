import express, { Request, Response, NextFunction } from 'express';
import { authRouter } from './auth/routes/auth.routes.js';
import { userRouter } from './auth/routes/user.routes.js';
import { authErrorHandler } from './auth/middleware/auth.middleware.js';

const app = express();

// Middleware
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/auth', authRouter);

// User routes (protected)
app.use('/users', userRouter);

// Auth error handler
app.use(authErrorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    Auth API Server                            ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}                       ║
║                                                               ║
║  Endpoints:                                                   ║
║    POST /auth/register   - Create new user                    ║
║    POST /auth/login      - Authenticate user                  ║
║    POST /auth/refresh    - Refresh access token               ║
║    POST /auth/logout     - Logout current session             ║
║    POST /auth/logout-all - Logout all sessions                ║
║    GET  /users/me        - Get current user (protected)       ║
║    PUT  /users/me        - Update profile (protected)        ║
║    DELETE /users/me      - Delete account (protected)         ║
║                                                               ║
║  Environment variables required:                               ║
║    JWT_SECRET           - Secret for signing access tokens    ║
║    JWT_REFRESH_SECRET   - Secret for signing refresh tokens   ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export { app, server };