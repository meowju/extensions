import { Request } from 'express';

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthPayload {
  userId: string;
  role: 'user' | 'admin';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export type CreateUserInput = {
  username: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type UpdateUserInput = {
  username?: string;
  email?: string;
  role?: 'user' | 'admin';
};

export type CreateNoteInput = {
  title: string;
  content: string;
};

export type UpdateNoteInput = {
  title?: string;
  content?: string;
};
