# REST API with Authentication - Specification

## Project Overview

- **Project name**: Meow API
- **Type**: RESTful API with JWT authentication
- **Core functionality**: Secure REST API with user authentication, protected routes, and CRUD operations
- **Target users**: Dashboard frontend, mobile apps, external integrations

## Technical Stack

- **Runtime**: Bun
- **Framework**: Express.js
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **Storage**: In-memory (demo) / SQLite (production-ready)

## Features

### 1. Authentication System
- [x] **POST /api/auth/register** - User registration
- [x] **POST /api/auth/login** - User login
- [x] **POST /api/auth/logout** - User logout
- [x] **GET /api/auth/me** - Get current user profile (protected)

### 2. Protected Routes
- [x] All `/api/users/*` routes require valid JWT
- [x] Token expiration: 24 hours
- [x] Bearer token in Authorization header

### 3. User Management (Protected)
- [x] **GET /api/users** - List all users (admin only)
- [x] **GET /api/users/:id** - Get user by ID
- [x] **PUT /api/users/:id** - Update user
- [x] **DELETE /api/users/:id** - Delete user (admin only)

### 4. Notes API (Protected)
- [x] **GET /api/notes** - List user's notes
- [x] **POST /api/notes** - Create note
- [x] **GET /api/notes/:id** - Get note by ID
- [x] **PUT /api/notes/:id** - Update note
- [x] **DELETE /api/notes/:id** - Delete note

### 5. API Features
- [x] Request logging
- [x] Error handling middleware
- [x] Input validation with Zod
- [x] CORS support
- [x] Rate limiting
- [x] Health check endpoint

## Acceptance Criteria

1. ✅ Users can register with email/password
2. ✅ Users can login and receive JWT token
3. ✅ Protected routes reject requests without valid token
4. ✅ Users can only access their own notes
5. ✅ Admin can manage all users
6. ✅ All inputs are validated
7. ✅ Passwords are securely hashed
8. ✅ API returns consistent JSON responses
9. ✅ Health check endpoint returns 200 OK
10. ✅ Unit tests cover core authentication flow
