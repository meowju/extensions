import { describe, it, expect, beforeEach } from 'bun:test';
import request from 'supertest';
import express, { Express } from 'express';
import { authRouter } from '../routes/auth.routes.js';
import { createUser, userServiceStore } from '../services/auth-user.service.js';

describe('Auth Controller (Integration)', () => {
  let app: Express;

  beforeEach(() => {
    // Clear user store
    userServiceStore.users.clear();
    userServiceStore.usersByEmail.clear();
    userServiceStore.userTokenVersions.clear();

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 409 for duplicate email', async () => {
      // First registration
      await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
          firstName: 'John',
          lastName: 'Doe',
        });

      // Second registration with same email
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
          firstName: 'Jane',
          lastName: 'Smith',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already registered');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a user before each login test
      await createUser({
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await createUser({
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Login to get tokens
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
        });

      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await createUser({
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
      });

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
        });

      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});