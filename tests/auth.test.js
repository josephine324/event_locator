const request = require('supertest');
const { app } = require('../app');
const pool = require('../config/db');
const bcrypt = require('bcrypt');

describe('Auth API', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('should login user with correct credentials', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 3,
        username: 'mutesi',
        password: await bcrypt.hash('1234', 10)
      }]
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'mutesi', password: '1234' })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(res.body.token).toMatch(/^eyJ/); 
  });

  it('should reject invalid credentials', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'mutesi', password: 'wrong' })
      .expect(401);

    expect(res.body.error).toBe('Invalid credentials');
  });
});