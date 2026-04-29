/**
 * REST Auth API Documentation
 * 
 * Base URL: http://localhost:3000/api/v1
 * 
 * Authentication: Bearer token in Authorization header
 * Content-Type: application/json
 * 
 * Endpoints:
 * 
 * AUTHENTICATION
 * ──────────────
 * POST /auth/register     - Create new user account
 * POST /auth/login        - Authenticate and get tokens
 * POST /auth/refresh      - Refresh access token
 * POST /auth/logout       - Invalidate current session
 * POST /auth/logout-all   - Invalidate all user sessions
 * 
 * USER (Protected - requires Bearer token)
 * ─────────────────────────────────────────
 * GET  /users/me          - Get current user profile
 * PUT  /users/me          - Update profile
 * DELETE /users/me        - Delete account
 * PUT  /users/me/password - Change password
 * 
 * REQUEST/RESPONSE EXAMPLES
 * ─────────────────────────
 * 
 * POST /auth/register
 * Request:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123!",
 *   "firstName": "John",
 *   "lastName": "Doe"
 * }
 * Response (201):
 * {
 *   "success": true,
 *   "data": {
 *     "user": {
 *       "id": "64abc...",
 *       "email": "user@example.com",
 *       "firstName": "John",
 *       "lastName": "Doe",
 *       "isEmailVerified": false,
 *       "createdAt": "2024-01-01T00:00:00.000Z"
 *     },
 *     "tokens": {
 *       "accessToken": "eyJ...",
 *       "refreshToken": "abc123...",
 *       "expiresIn": 900,
 *       "tokenType": "Bearer"
 *     }
 *   },
 *   "message": "User registered successfully"
 * }
 * 
 * POST /auth/login
 * Request:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123!"
 * }
 * Response (200):
 * {
 *   "success": true,
 *   "data": { ... },
 *   "message": "Login successful"
 * }
 * 
 * POST /auth/refresh
 * Request:
 * {
 *   "refreshToken": "abc123..."
 * }
 * Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "accessToken": "eyJ...",
 *     "refreshToken": "new123...",
 *     "expiresIn": 900,
 *     "tokenType": "Bearer"
 *   },
 *   "message": "Token refreshed successfully"
 * }
 * 
 * ERROR RESPONSES
 * ───────────────
 * 400 Bad Request    - Validation failed
 * 401 Unauthorized    - Invalid/expired token
 * 409 Conflict        - Email already exists
 * 429 Too Many Requests - Rate limited
 * 500 Internal Error  - Server error
 * 
 * Example Error:
 * {
 *   "success": false,
 *   "message": "Validation failed",
 *   "errors": [
 *     { "path": "email", "message": "Invalid email format" }
 *   ]
 * }
 */

export const API_DOCS = {
  version: '1.0.0',
  title: 'Auth REST API',
  baseUrl: 'http://localhost:3000/api/v1',
  endpoints: {
    auth: {
      register: 'POST /auth/register',
      login: 'POST /auth/login',
      refresh: 'POST /auth/refresh',
      logout: 'POST /auth/logout',
      logoutAll: 'POST /auth/logout-all',
    },
    user: {
      me: 'GET /users/me',
      updateMe: 'PUT /users/me',
      deleteMe: 'DELETE /users/me',
      changePassword: 'PUT /users/me/password',
    }
  }
};