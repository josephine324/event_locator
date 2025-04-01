const request = require('supertest');
const { app } = require('../app');
const pool = require('../config/db');

describe('Location-Based Search', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('should return events within radius (mocked)', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        titles: { en: 'Nearby Event', es: '', fr: '' },
        descriptions: { en: 'Close by', es: '', fr: '' },
        longitude: -73.935242,
        latitude: 40.730610,
        event_date: '2025-07-25',
        categories: ['test'],
        created_by: 1
      }]
    });

    const res = await request(app)
      .get('/events')
      .query({ lat: 40.730610, lng: -73.935242, radius: 10 })
      .expect(200);

    expect(res.body[0].titles.en).toBe('Nearby Event');
  });
});