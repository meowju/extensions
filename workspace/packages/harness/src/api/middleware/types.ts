/**
 * Types for authentication
 */

export interface UserPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      name?: string;
      role: string;
    };
    token: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}