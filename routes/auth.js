const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id }, 'your-jwt-secret', { expiresIn: '1h' });
    console.log('Generated token:', token); // Debug
    res.json({ token });
  } catch (err) {
    console.error(err.stack);
    res.status(500).send('Server error');
  }
});

module.exports = router;