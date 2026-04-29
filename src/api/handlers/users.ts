import { getUserById } from '../store.ts';
import { authMiddleware } from '../middleware.ts';
import type { ApiResponse, User } from '../server.ts';

export const userRoutes = {
  async me(request: Request): Promise<Response> {
    const { user, authorized } = await authMiddleware(request);
    
    if (!authorized || !user) {
      return Response.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    const dbUser = getUserById(user.userId);
    
    if (!dbUser) {
      return Response.json(
        { success: false, error: 'User not found' } as ApiResponse,
        { status: 404 }
      );
    }

    const { passwordHash, ...safeUser } = dbUser;

    return Response.json({
      success: true,
      data: safeUser
    } as ApiResponse<User>);
  }
};
