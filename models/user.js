const pool = require('../config/db');
const bcrypt = require('bcrypt');

const User = {
  
  async create({ username, password, location, preferences, language }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (username, password, location, preferences, language, is_admin)
      VALUES ($1, $2, ST_GeogFromText($3), $4, $5, FALSE)
      RETURNING id, username, language, is_admin
    `;
    const values = [
      username,
      hashedPassword,
      `POINT(${location.longitude} ${location.latitude})`,
      preferences || '{}',
      language || 'en'
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

 
  async createAdmin({ username, password, location, preferences, language }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (username, password, location, preferences, language, is_admin)
      VALUES ($1, $2, ST_GeogFromText($3), $4, $5, TRUE)
      RETURNING id, username, language, is_admin
    `;
    const values = [
      username,
      hashedPassword,
      `POINT(${location.longitude} ${location.latitude})`,
      preferences || '{}',
      language || 'en'
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  },

  async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
};

module.exports = User;