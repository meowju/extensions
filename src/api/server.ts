import { matchRoute, handleNotFound, handleMethodNotAllowed } from './routes.ts';

const PORT = parseInt(process.env.PORT || '3000');

const server = Bun.serve({
  port: PORT,
  
  async fetch(request) {
    const url = new URL(request.url);
    
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

    const handler = matchRoute(request);
    
    if (!handler) {
      return handleNotFound();
    }

    try {
      const response = await handler(request);
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };
      
      const clone = new Response(response.body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          ...corsHeaders
        }
      });
      
      return clone;
    } catch (error) {
      console.error('Route error:', error);
      return Response.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
});

console.log(`🚀 API Server running at http://localhost:${server.port}`);
console.log('');
console.log('Available endpoints:');
console.log('  POST   /api/auth/register   - Register new user');
console.log('  POST   /api/auth/login      - Login');
console.log('  GET    /api/users/me        - Get current user (auth required)');
