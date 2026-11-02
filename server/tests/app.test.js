import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('health and auth boundary', () => {
  it('reports health', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
  it('rejects protected routes without a cookie', async () => {
    const response = await request(app).get('/api/dashboard');
    expect(response.status).toBe(401);
  });
});
