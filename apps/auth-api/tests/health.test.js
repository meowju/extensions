import request from 'supertest';
import app from '../src/app.js';

describe('Health API', () => {
  describe('GET /api/health', () => {
    it('should return ok status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });
});