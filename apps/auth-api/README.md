# REST API with Authentication

A secure REST API built with Express.js featuring JWT authentication.

## Features

- User registration and login
- JWT-based authentication
- Protected routes
- Password hashing with bcrypt
- Rate limiting
- Input validation
- Security headers with Helmet

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start the server
npm start
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |

### Protected Endpoints (require JWT token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |

## Usage Example

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Get users (with token)
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Testing

```bash
npm test
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| JWT_SECRET | JWT signing secret | (required) |
| NODE_ENV | Environment | development |