/**
 * Auth Routes - handles /auth/* endpoints
 */

import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
} from '../controllers/auth.controller.js';

export interface RouteHandler {
  handler: (request: Request, response: Response, next?: NextFunction) => Promise<void>;
  methods: string[];
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
}

export const authRoutes: Record<string, RouteHandler> = {
  '/auth/register': {
    handler: register,
    methods: ['POST'],
  },
  '/auth/login': {
    handler: login,
    methods: ['POST'],
  },
  '/auth/logout': {
    handler: logout,
    methods: ['POST'],
  },
  '/auth/refresh-token': {
    handler: refreshToken,
    methods: ['POST'],
  },
  '/auth/me': {
    handler: getCurrentUser,
    methods: ['GET'],
    middleware: [authenticate],
  },
};