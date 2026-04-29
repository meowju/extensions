import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { authRouter } from '../routes/auth.routes.js';
import { userRouter } from '../routes/user.routes.js';
import { createUser } from '../services/user.service.js';
import { userStore } from '../services/user.service.js';

describe('Protected Routes', () => {
  let app: Express;
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clear user store
    userStore.users.clear();
    userStore.usersByEmail.clear();
    userStore.userTokenVersions.clear();

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
    app.use('/users', userRouter);

    // Create user and login
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

    accessToken = loginResponse.body.data.tokens.accessToken;
    userId = loginResponse.body.data.user.id;
  });

  describe('GET /users/me', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/users/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/me', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .put('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Jane', lastName: 'Smith' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Jane');
      expect(response.body.data.lastName).toBe('Smith');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .put('/users/me')
        .send({ firstName: 'Jane' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /users/me', () => {
    it('should delete user account', async () => {
      const response = await request(app)
        .delete('/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).delete('/users/me');

      expect(response.status).toBe(401);
    });
  });
});