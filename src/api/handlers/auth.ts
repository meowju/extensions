import { createToken, verifyPassword } from '../crypto.ts';
import { createUser, getUserByEmail, sanitizeUser } from '../store.ts';
import type { ApiResponse, User } from '../server.ts';

export const authRoutes = {
  async register(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      const { email, password, name } = body;

      if (!email || !password || !name) {
        return Response.json(
          { success: false, error: 'Email, password, and name are required' } as ApiResponse,
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return Response.json(
          { success: false, error: 'Password must be at least 8 characters' } as ApiResponse,
          { status: 400 }
        );
      }

      const user = await createUser(email, password, name);
      
      if (!user) {
        return Response.json(
          { success: false, error: 'Email already registered' } as ApiResponse,
          { status: 409 }
        );
      }

      const token = await createToken(user.id, user.email);
      const safeUser = sanitizeUser(user);

      return Response.json({
        success: true,
        data: { user: safeUser, token },
        message: 'Registration successful'
      } as ApiResponse<{ user: Omit<User, 'passwordHash'>; token: string }>, {
        status: 201
      });
    } catch {
      return Response.json(
        { success: false, error: 'Invalid request body' } as ApiResponse,
        { status: 400 }
      );
    }
  },

  async login(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      const { email, password } = body;

      if (!email || !password) {
        return Response.json(
          { success: false, error: 'Email and password are required' } as ApiResponse,
          { status: 400 }
        );
      }

      const user = getUserByEmail(email);
      
      if (!user) {
        return Response.json(
          { success: false, error: 'Invalid credentials' } as ApiResponse,
          { status: 401 }
        );
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      
      if (!isValid) {
        return Response.json(
          { success: false, error: 'Invalid credentials' } as ApiResponse,
          { status: 401 }
        );
      }

      const token = await createToken(user.id, user.email);
      const safeUser = sanitizeUser(user);

      return Response.json({
        success: true,
        data: { user: safeUser, token },
        message: 'Login successful'
      } as ApiResponse<{ user: Omit<User, 'passwordHash'>; token: string }>);
    } catch {
      return Response.json(
        { success: false, error: 'Invalid request body' } as ApiResponse,
        { status: 400 }
      );
    }
  }
};
