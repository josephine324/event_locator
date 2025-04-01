const pool = require('../config/db');
const transporter = require('../config/email');
const { broadcast } = require('../websocket');

const Event = {
  async create({ titles, descriptions, location, event_date, categories, created_by }) {
    if (!location || 
        location.latitude == null || 
        location.longitude == null || 
        typeof location.latitude !== 'number' || 
        typeof location.longitude !== 'number' || 
        isNaN(location.latitude) || 
        isNaN(location.longitude)) {
      throw new Error('Invalid location');
    }

    const fullTitles = {
      en: titles.en || '',
      es: titles.es || '',
      fr: titles.fr || ''
    };
    const fullDescriptions = {
      en: descriptions.en || '',
      es: descriptions.es || '',
      fr: descriptions.fr || ''
    };

    const query = `
      INSERT INTO events (titles, descriptions, location, event_date, categories, created_by)
      VALUES ($1, $2, ST_GeogFromText(ST_AsText(ST_Point($3, $4))), $5, $6, $7)
      RETURNING *
    `;
    const values = [
      JSON.stringify(fullTitles),
      JSON.stringify(fullDescriptions),
      location.longitude,
      location.latitude,
      event_date,
      categories || '{}',
      created_by
    ];
    const result = await pool.query(query, values);
    const event = result.rows[0];

    await this.notifyUsers(event);

    const broadcastEvent = {
      id: event.id,
      titles: event.titles,
      descriptions: event.descriptions,
      latitude: location.latitude,
      longitude: location.longitude,
      event_date: event.event_date
    };
    console.log('Broadcasting event:', broadcastEvent);
    try {
      broadcast({ type: 'new_event', data: broadcastEvent });
    } catch (err) {
      console.error('Broadcast error:', err.message);
    }

    return event;
  },

  async notifyUsers(event) {
    const { titles, descriptions, event_date, id: event_id } = event;
    const radius = 10000;

    try {
      const locationQuery = `
        SELECT ST_X(location::geometry) AS longitude, ST_Y(location::geometry) AS latitude
        FROM events WHERE id = $1
      `;
      const locationResult = await pool.query(locationQuery, [event_id]);
      const { longitude, latitude } = locationResult.rows[0];
      const point = `POINT(${longitude} ${latitude})`;

      const query = `
        SELECT id, email, language
        FROM users
        WHERE ST_DWithin(location, ST_GeogFromText($1), $2)
        AND notify = TRUE
        AND email IS NOT NULL
      `;
      const result = await pool.query(query, [point, radius]);
      const users = result.rows;

      for (const user of users) {
        const lang = user.language || 'en';
        const title = titles[lang] || titles.en;
        const description = descriptions[lang] || descriptions.en;
        const message = `New event: ${title} near you!`;

        const mailOptions = {
          from: 'your-email@gmail.com',
          to: user.email,
          subject: `New Event: ${title}`,
          text: `${message}\n\nDetails:\n${description}\nDate: ${event_date}`
        };
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) console.error('Email error:', err.message);
          else console.log('Email sent to', user.email, 'Info:', info.response);
        });
      }
    } catch (err) {
      console.error('Notify users error:', err.message);
    }
  },

  async addReview({ user_id, event_id, rating, review }) {
    const query = `
      INSERT INTO reviews (user_id, event_id, rating, review)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, event_id)
      DO UPDATE SET rating = $3, review = $4, created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [user_id, event_id, rating, review || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getReviews(event_id) {
    const query = `
      SELECT r.*, u.username,
             (SELECT AVG(rating)::numeric(3,1) FROM reviews WHERE event_id = $1) AS average_rating
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = $1
      ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query, [event_id]);
    return {
      reviews: result.rows,
      average_rating: result.rows.length > 0 ? result.rows[0].average_rating : null
    };
  },

  async addFavorite(user_id, event_id) {
    const query = `
      INSERT INTO favorites (user_id, event_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, event_id) DO NOTHING
    `;
    await pool.query(query, [user_id, event_id]);
  },

  async getFavorites(user_id) {
    const query = `
      SELECT e.*, 
             ST_X(e.location::geometry) AS longitude,
             ST_Y(e.location::geometry) AS latitude
      FROM favorites f
      JOIN events e ON f.event_id = e.id
      WHERE f.user_id = $1
    `;
    const result = await pool.query(query, [user_id]);
    return result.rows;
  },

  async findAllWithLocations() {
    const query = `
      SELECT e.*,
             ST_X(e.location::geometry) AS longitude,
             ST_Y(e.location::geometry) AS latitude
      FROM events e
      ORDER BY e.event_date DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows.map(event => ({
        ...event,
        longitude: parseFloat(event.longitude),
        latitude: parseFloat(event.latitude)
      }));
    } catch (err) {
      console.error('Find all events error:', err.message);
      throw err;
    }
  }
};

module.exports = Event;