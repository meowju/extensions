// Re-export types from schemas
export type {
  CreateItemInput,
  UpdateItemInput,
  PatchItemInput,
  PaginationQuery,
  IdParam,
} from '../schemas/items.schema.js';

// Core type definitions for the REST API

export interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;
}

export type HttpStatusCode = 200 | 201 | 204 | 400 | 404 | 409 | 500;
