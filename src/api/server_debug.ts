import { authRoutes } from './handlers/auth.ts';
import { userRoutes } from './handlers/users.ts';

type Handler = (request: Request) => Promise<Response>;

const routes: Array<{pattern: URLPattern, handler: Handler, methods: string[]}> = [
  { pattern: new URLPattern({ pathname: '/api/auth/register' }), handler: authRoutes.register, methods: ['POST'] },
  { pattern: new URLPattern({ pathname: '/api/auth/login' }), handler: authRoutes.login, methods: ['POST'] },
  { pattern: new URLPattern({ pathname: '/api/users/me' }), handler: userRoutes.me, methods: ['GET'] },
];

const server = Bun.serve({
  port: 3001,
  
  async fetch(request) {
    const url = new URL(request.url);
    console.log(`[${request.method}] ${request.url}`);
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    for (const route of routes) {
      console.log('Testing route:', route.pattern.pathname, 'against:', url.pathname, '->', route.pattern.test(url));
      if (route.pattern.test(url) && route.methods.includes(request.method)) {
        console.log('Matched route:', route.pattern.pathname);
        return route.handler(request);
      }
    }
    
    return Response.json({ success: false, error: 'Not found' }, { status: 404 });
  }
});

console.log(`Debug server running at http://localhost:${server.port}`);
