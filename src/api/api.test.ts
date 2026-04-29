import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { createToken, verifyToken, hashPassword, verifyPassword, generateId } from './crypto.ts';
import { createUser, getUserByEmail, sanitizeUser } from './store.ts';

describe('Crypto Utils', () => {
  test('generateId creates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('hashPassword creates a hash', async () => {
    const hash = await hashPassword('password123');
    expect(hash).toBeTruthy();
    expect(hash).not.toBe('password123');
  });

  test('verifyPassword validates correct password', async () => {
    const hash = await hashPassword('mypassword');
    const isValid = await verifyPassword('mypassword', hash);
    expect(isValid).toBe(true);
  });

  test('verifyPassword rejects wrong password', async () => {
    const hash = await hashPassword('mypassword');
    const isValid = await verifyPassword('wrongpassword', hash);
    expect(isValid).toBe(false);
  });

  test('createToken and verifyToken work', async () => {
    const token = await createToken('user-123', 'test@example.com');
    expect(token).toContain('.');
    
    const payload = await verifyToken(token);
    expect(payload).toEqual({ userId: 'user-123', email: 'test@example.com' });
  });

  test('verifyToken rejects invalid token', async () => {
    const payload = await verifyToken('invalid.token.here');
    expect(payload).toBe(null);
  });

  test('verifyToken rejects expired token', async () => {
    // Create a manually crafted expired token
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      userId: 'user-123',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000) - 86400,
      exp: Math.floor(Date.now() / 1000) - 43200
    }));
    const payload2 = payload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const expiredToken = `${header.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}.${payload2}.fake`;
    
    const result = await verifyToken(expiredToken);
    expect(result).toBe(null);
  });
});

describe('User Store', () => {
  test('createUser creates a new user', async () => {
    const user = await createUser('new@example.com', 'password123', 'New User');
    expect(user).toBeTruthy();
    expect(user?.email).toBe('new@example.com');
    expect(user?.name).toBe('New User');
    expect(user?.passwordHash).toBeTruthy();
  });

  test('createUser returns null for duplicate email', async () => {
    await createUser('duplicate@example.com', 'password123', 'First User');
    const second = await createUser('duplicate@example.com', 'password456', 'Second User');
    expect(second).toBe(null);
  });

  test('getUserByEmail finds user', async () => {
    await createUser('findme@example.com', 'password123', 'Find Me');
    const user = getUserByEmail('findme@example.com');
    expect(user).toBeTruthy();
    expect(user?.name).toBe('Find Me');
  });

  test('sanitizeUser removes passwordHash', () => {
    const user = {
      id: '123',
      email: 'test@example.com',
      passwordHash: 'secret',
      name: 'Test',
      createdAt: new Date()
    };
    const safe = sanitizeUser(user);
    expect(safe.passwordHash).toBeUndefined();
    expect(safe.email).toBe('test@example.com');
  });
});

describe('Auth API Integration', () => {
  test('full auth flow: register -> login -> access protected route', async () => {
    // Register
    const registerRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'integration@example.com',
        password: 'password123',
        name: 'Integration Test'
      })
    });
    
    const registerData = await registerRes.json();
    expect(registerRes.status).toBe(201);
    expect(registerData.success).toBe(true);
    expect(registerData.data.token).toBeTruthy();
    expect(registerData.data.user.email).toBe('integration@example.com');
    expect(registerData.data.user.passwordHash).toBeUndefined();

    const token = registerData.data.token;

    // Access protected route
    const meRes = await fetch('http://localhost:3000/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const meData = await meRes.json();
    expect(meRes.status).toBe(200);
    expect(meData.success).toBe(true);
    expect(meData.data.email).toBe('integration@example.com');
  });

  test('protected route rejects without token', async () => {
    const res = await fetch('http://localhost:3000/api/users/me');
    expect(res.status).toBe(401);
  });

  test('protected route rejects invalid token', async () => {
    const res = await fetch('http://localhost:3000/api/users/me', {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    expect(res.status).toBe(401);
  });

  test('login with valid credentials', async () => {
    await createUser('login@example.com', 'password123', 'Login Test');
    
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'login@example.com',
        password: 'password123'
      })
    });
    
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.token).toBeTruthy();
  });

  test('login rejects wrong password', async () => {
    await createUser('wrongpass@example.com', 'correctpassword', 'Wrong Pass');
    
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrongpass@example.com',
        password: 'wrongpassword'
      })
    });
    
    expect(res.status).toBe(401);
  });

  test('404 for unknown routes', async () => {
    const res = await fetch('http://localhost:3000/api/unknown');
    expect(res.status).toBe(404);
  });

  test('CORS headers are present', async () => {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Origin': 'http://example.com'
      }
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
