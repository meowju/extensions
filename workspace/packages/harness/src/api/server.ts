/**
 * API Server - Main entry point for the REST API
 */

import { authRoutes, itemRoutes } from './routes/index.js';
import { handleError } from './middleware/error-handler.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

// Combine all routes
const allRoutes = { ...authRoutes, ...itemRoutes };

/**
 * Parse URL and extract route parameters
 */
function matchRoute(method: string, url: string): { handler: Function; params: Record<string, string> } | null {
  const routePath = url.replace(BASE_URL, '') || '/';
  
  // Exact match first
  if (allRoutes[routePath]) {
    const route = allRoutes[routePath];
    if (route.methods.includes(method)) {
      return { handler: route.handler, params: {} };
    }
  }

  // Pattern matching for parameterized routes
  for (const [pattern, route] of Object.entries(allRoutes)) {
    if (!route.methods.includes(method)) continue;
    
    const paramNames = route.paramNames ?? [];
    const patternParts = pattern.split('/');
    const pathParts = routePath.split('/');

    if (patternParts.length !== pathParts.length) continue;

    let params: Record<string, string> = {};
    let matches = true;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        // This is a parameter
        const paramName = patternParts[i].slice(1);
        params[paramName] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return { handler: route.handler, params };
    }
  }

  return null;
}

/**
 * Request logging middleware
 */
function logRequest(method: string, url: string, status: number, duration: number): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${method} ${url} ${status} - ${duration}ms`);
}

/**
 * Main request handler
 */
async function handleRequest(request: Request): Promise<Response> {
  const startTime = Date.now();
  const method = request.method;
  const url = new URL(request.url).pathname;

  console.log(`[${new Date().toISOString()}] ${method} ${url}`);

  // Try to match a route
  const matched = matchRoute(method, url);

  if (!matched) {
    const duration = Date.now() - startTime;
    logRequest(method, url, 404, duration);
    
    return Response.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${method} ${url} not found`,
        },
      },
      { status: 404 }
    );
  }

  try {
    const response = await matched.handler(request, matched.params);
    const duration = Date.now() - startTime;
    logRequest(method, url, response.status, duration);
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logRequest(method, url, 500, duration);
    return handleError(error);
  }
}

/**
 * Create and start the server
 */
function createServer(): string {
  const server = Bun.serve({
    port: PORT,
    async fetch(request) {
      return handleRequest(request);
    },
  });

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    API Server Started                     ║
╠═══════════════════════════════════════════════════════════╣
║  Base URL:     ${BASE_URL}/api/v1                        ║
║  Port:         ${PORT}                                      ║
╠═══════════════════════════════════════════════════════════╣
║                      Available Routes                     ║
╠═══════════════════════════════════════════════════════════╣
║  Auth Endpoints:                                         ║
║    POST   /auth/register  - Register new user            ║
║    POST   /auth/login     - Login user                   ║
║    POST   /auth/logout    - Logout user                  ║
║    GET    /auth/me        - Get current user            ║
╠═══════════════════════════════════════════════════════════╣
║  Items Endpoints:                                        ║
║    GET    /items          - List items (paginated)       ║
║    POST   /items/create   - Create new item              ║
║    GET    /items/:id      - Get single item              ║
║    PUT    /items/:id/update - Update item (full)         ║
║    PATCH  /items/:id/patch - Partial update              ║
║    DELETE /items/:id/delete - Delete item               ║
╚═══════════════════════════════════════════════════════════╝
  `);

  return `http://localhost:${server.port}`;
}

// Export for testing
export { handleRequest, matchRoute, createServer };

// Start server if run directly
if (import.meta.main) {
  createServer();
}