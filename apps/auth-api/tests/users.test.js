import request from 'supertest';
import app from '../src/app.js';
import db from '../src/config/database.js';

describe('Users API', () => {
  let token;
  let userId;

  beforeAll(async () => {
    db.exec('DELETE FROM users');

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'apitest',
        email: 'api@test.com',
        password: 'testpassword123',
      });

    userId = registerRes.body.user.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'api@test.com',
        password: 'testpassword123',
      });

    token = loginRes.body.token;
  });

  afterAll(() => {
    db.close();
  });

  describe('GET /api/users', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/users');
      expect(res.statusCode).toBe(401);
    });

    it('should return all users with valid token', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(Array.isArray(res.body.users)).toBe(true);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by id', async () => {
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('id', userId);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/users/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });
  });
});