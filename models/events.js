const pool = require('../config/db');
const transporter = require('../config/email');

const Event = {
  async create({ titles, descriptions, location, event_date, categories, created_by }) {
    if (!location || 
        location.latitude == null || 
        location.longitude == null || 
        typeof location.latitude !== 'number' || 
        typeof location.longitude !== 'number' || 
        isNaN(location.latitude) || 
        isNaN(location.longitude)) {
      throw new Error('Invalid location: latitude and longitude must be valid, non-null numbers');
    }

    const query = `
      INSERT INTO events (titles, descriptions, location, event_date, categories, created_by)
      VALUES ($1, $2, ST_GeogFromText(ST_AsText(ST_Point($3, $4))), $5, $6, $7)
      RETURNING *
    `;
    const values = [
      JSON.stringify(titles),
      JSON.stringify(descriptions),
      location.longitude,
      location.latitude,
      event_date,
      categories || '{}',
      created_by
    ];
    console.log('Creating event with values:', values);
    const result = await pool.query(query, values);
    const event = result.rows[0];
    await this.notifyUsers(event);
    return event;
  },

  async findAll() {
    const query = 'SELECT * FROM events';
    const result = await pool.query(query);
    return result.rows;
  },

  async findById(id) {
    const query = 'SELECT * FROM events WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async update(id, { titles, descriptions, location, event_date, categories }) {
    const query = `
      UPDATE events
      SET titles = $1, descriptions = $2, location = ST_GeogFromText($3),
          event_date = $4, categories = $5
      WHERE id = $6
      RETURNING *
    `;
    const values = [
      JSON.stringify(titles),
      JSON.stringify(descriptions),
      location ? `POINT(${location.longitude} ${location.latitude})` : null,
      event_date,
      categories || '{}',
      id
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    const query = 'DELETE FROM events WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async findByLocationAndCategories({ latitude, longitude, radius, categories }) {
    let query = `
      SELECT *,
             ST_Distance(
               location,
               ST_GeogFromText($1)
             ) AS distance
      FROM events
      WHERE ST_DWithin(
        location,
        ST_GeogFromText($1),
        $2
      )
    `;
    const values = [`POINT(${longitude} ${latitude})`, radius];
    if (categories && categories.length > 0) {
      query += ` AND categories && $3`;
      values.push(categories);
    }
    query += ` ORDER BY distance;`;
    const result = await pool.query(query, values);
    return result.rows;
  },

  async findByFilters({ categories, start_date, end_date, location, radius }) {
    let query = `
      SELECT *,
             ${location ? 'ST_Distance(location, ST_GeogFromText($1)) AS distance' : 'NULL AS distance'}
      FROM events
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (location) {
      values.push(`POINT(${location.longitude} ${location.latitude})`);
      query += ` AND ST_DWithin(location, ST_GeogFromText($${paramIndex}), $${paramIndex + 1})`;
      values.push(radius);
      paramIndex += 2;
    }

    if (categories && categories.length > 0) {
      query += ` AND categories && $${paramIndex}`;
      values.push(categories);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND event_date >= $${paramIndex}`;
      values.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND event_date <= $${paramIndex}`;
      values.push(end_date);
      paramIndex++;
    }

    query += location ? ' ORDER BY distance' : ' ORDER BY event_date';
    console.log('Query:', query, 'Values:', values);
    const result = await pool.query(query, values);
    return result.rows;
  },

  async notifyUsers(event) {
    const { titles, descriptions, categories, event_date, id: event_id } = event;
    const radius = 10000;

    const locationQuery = `
      SELECT ST_X(location::geometry) AS longitude, ST_Y(location::geometry) AS latitude
      FROM events
      WHERE id = $1
    `;
    const locationResult = await pool.query(locationQuery, [event_id]);
    const { longitude, latitude } = locationResult.rows[0];
    const point = `POINT(${longitude} ${latitude})`;
    console.log('Notifying users for event:', { event_id, categories, point });

    const query = `
      SELECT id, username, language, email
      FROM users
      WHERE preferences && $1
      AND ST_DWithin(
        location,
        ST_GeogFromText($2),
        $3
      )
      AND notify = TRUE
      AND email IS NOT NULL
    `;
    const values = [categories, point, radius];
    const result = await pool.query(query, values);
    const users = result.rows;
    console.log('Matching users:', users);

    for (const user of users) {
      const lang = user.language || 'en';
      const title = titles[lang] || titles.en;
      const description = descriptions[lang] || descriptions.en;
      const message = `New event: ${title} near you!`;

      await pool.query(
        'INSERT INTO notifications (user_id, event_id, message) VALUES ($1, $2, $3)',
        [user.id, event_id, message]
      ).catch(err => console.error('Notification insert error:', err.message));

      const mailOptions = {
        from: 'your-email@gmail.com',
        to: user.email,
        subject: `New Event: ${title}`,
        text: `${message}\n\nDetails:\n${description}\nDate: ${event_date}\nLocation: (${latitude}, ${longitude})`
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Email send error:', err.message);
        } else {
          console.log('Email sent to', user.email, 'Info:', info.response);
        }
      });
    }
  }
};

module.exports = Event;