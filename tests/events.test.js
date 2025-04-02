const request = require('supertest');
const { app } = require('../app');
const pool = require('../config/db');
const { broadcast } = require('../websocket');

jest.mock('../websocket', () => ({
  setWebSocketServer: jest.fn(),
  broadcast: jest.fn()
}));

describe('Events API', () => {
  beforeEach(() => {
    pool.query.mockReset();
    broadcast.mockReset();
  });

  it('should create an event', async () => {
    pool.query
      .mockResolvedValueOnce({ 
        rows: [{
          id: 1,
          titles: { en: 'Test Event', es: '', fr: '' },
          descriptions: { en: 'Test Desc', es: '', fr: '' },
          location: 'POINT(-73.935242 40.730610)',
          event_date: '2025-07-25',
          categories: ['test'],
          created_by: 1
        }]
      })
      .mockResolvedValueOnce({ 
        rows: [{ longitude: -73.935242, latitude: 40.730610 }]
      })
      .mockResolvedValueOnce({ 
        rows: [] 
      });

    const eventData = {
      titles: { en: 'Test Event' },
      descriptions: { en: 'Test Desc' },
      location: { latitude: 40.730610, longitude: -73.935242 },
      event_date: '2025-07-25',
      categories: ['test']
    };

    const res = await request(app)
      .post('/events')
      .send(eventData)
      .expect(201);

    expect(res.body.message).toBe('Event created');
    expect(res.body.event.id).toBe(1);
    expect(broadcast).toHaveBeenCalledWith({
      type: 'new_event',
      data: expect.objectContaining({
        id: 1,
        titles: { en: 'Test Event', es: '', fr: '' }
      })
    });
  });
});