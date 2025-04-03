const request = require('supertest');
const { app } = require('../app');
const pool = require('../config/db');
const transporter = require('../config/email');
const { broadcast } = require('../websocket');


jest.mock('../config/email', () => ({
  sendMail: jest.fn().mockResolvedValue({})
}));

jest.mock('../websocket', () => ({
  setWebSocketServer: jest.fn(),
  broadcast: jest.fn()
}));

describe('Notification System', () => {
  beforeEach(() => {
    
    pool.query.mockReset();
    transporter.sendMail.mockReset();
    broadcast.mockReset();
  });

  it('should send email and broadcast on event creation', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          titles: { en: 'New Event', es: '', fr: '' },
          descriptions: { en: 'Test', es: '', fr: '' },
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
        rows: [{ id: 3, email: 'j.mutesi@alustudent.com', language: 'en' }]
      });

    const eventData = {
      titles: { en: 'New Event' },
      descriptions: { en: 'Test' },
      location: { latitude: 40.730610, longitude: -73.935242 },
      event_date: '2025-07-25',
      categories: ['test']
    };

    await request(app)
      .post('/events')
      .send(eventData)
      .expect(201);

    
    expect(transporter.sendMail).toHaveBeenCalled();
    
    
    const emailCall = transporter.sendMail.mock.calls[0][0];
    expect(emailCall).toMatchObject({
      to: 'j.mutesi@alustudent.com',
      subject: expect.stringContaining('New Event')
    });

    
    expect(broadcast).toHaveBeenCalledWith({
      type: 'new_event',
      data: expect.objectContaining({ 
        id: 1, 
        titles: { en: 'New Event', es: '', fr: '' } 
      })
    });
  });

  it('should handle empty notification results gracefully', async () => {
    pool.query
      .mockResolvedValueOnce({ 
        rows: [{
          id: 1,
          titles: { en: 'New Event', es: '', fr: '' },
          descriptions: { en: 'Test', es: '', fr: '' },
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
      titles: { en: 'New Event' },
      descriptions: { en: 'Test' },
      location: { latitude: 40.730610, longitude: -73.935242 },
      event_date: '2025-07-25',
      categories: ['test']
    };

    await request(app)
      .post('/events')
      .send(eventData)
      .expect(201);

    
    expect(transporter.sendMail).not.toHaveBeenCalled();
    
    expect(broadcast).toHaveBeenCalledWith({
      type: 'new_event',
      data: expect.objectContaining({ 
        id: 1, 
        titles: { en: 'New Event', es: '', fr: '' } 
      })
    });
  });
});