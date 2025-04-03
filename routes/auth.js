const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const User = require('../models/user'); 

router.post('/register', async (req, res) => {
  const { username, password, location, preferences, language } = req.body;
  try {
    
    const existingUser = await User.findByUsername(username); 
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    
    const user = await User.create({ 
      username,
      password,
      location: location || { latitude: 0, longitude: 0 }, 
      preferences: preferences || {},
      language: language || 'en'
    });

    
    const token = jwt.sign({ id: user.id }, 'your-jwt-secret', { expiresIn: '1h' });
    console.log('Generated token:', token);

    res.status(201).json({ message: 'User registered', user, token });
  } catch (err) {
    console.error('Registration error:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id }, 'your-jwt-secret', { expiresIn: '1h' });
    console.log('Generated token:', token);
    res.json({ token });
  } catch (err) {
    console.error(err.stack);
    res.status(500).send('Server error');
  }
});
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;