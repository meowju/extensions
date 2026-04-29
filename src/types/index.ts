import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}
