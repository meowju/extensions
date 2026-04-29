import { authRoutes } from './handlers/auth.ts';
import { userRoutes } from './handlers/users.ts';

type Handler = (request: Request) => Promise<Response>;

interface Route {
  pattern: URLPattern;
  handler: Handler;
  methods: string[];
}

const routes: Route[] = [
  // Auth routes
  { pattern: new URLPattern({ pathname: '/api/auth/register' }), handler: authRoutes.register, methods: ['POST'] },
  { pattern: new URLPattern({ pathname: '/api/auth/login' }), handler: authRoutes.login, methods: ['POST'] },
  
  // User routes
  { pattern: new URLPattern({ pathname: '/api/users/me' }), handler: userRoutes.me, methods: ['GET'] },
];

export function matchRoute(request: Request): Handler | null {
  const method = request.method;
  
  for (const route of routes) {
    if (route.pattern.test(request.url) && route.methods.includes(method)) {
      return route.handler;
    }
  }
  
  return null;
}

export function handleNotFound(): Response {
  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404 }
  );
}

export function handleMethodNotAllowed(): Response {
  return Response.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}
