import { verifyToken } from './crypto.ts';
import type { AuthPayload } from './server.ts';

export async function authMiddleware(request: Request): Promise<{ user: AuthPayload | null; authorized: boolean }> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, authorized: false };
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  
  if (!payload) {
    return { user: null, authorized: false };
  }

  return {
    user: {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400
    },
    authorized: true
  };
}

export function requireAuth(handler: (request: Request, user: AuthPayload) => Response) {
  return async (request: Request): Promise<Response> => {
    const { user, authorized } = await authMiddleware(request);
    
    if (!authorized || !user) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return handler(request, user);
  };
}
