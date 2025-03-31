const express = require('express');
const router = express.Router();
const User = require('../models/user');
const pool = require('../config/db');
const passport = require('../middleware/passport');
const { ensureAdmin, ensureAuthenticated } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { username, password, location, preferences, language } = req.body;
    const user = await User.create({ username, password, location, preferences, language });
    res.status(201).json({ message: 'User registered', user });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

router.post('/create-admin', ensureAdmin, async (req, res) => {
  try {
    const { username, password, location, preferences, language } = req.body;
    const user = await User.createAdmin({ username, password, location, preferences, language });
    res.status(201).json({ message: 'Admin registered', user });
  } catch (err) {
    console.error('Admin creation error:', err.message);
    res.status(500).json({ error: 'Admin creation failed', details: err.message });
  }
});

router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Logged in successfully', user: req.user });
});

router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ message: 'Logged out' });
  });
});

router.put('/profile', ensureAuthenticated, async (req, res) => {
  try {
    const { language, preferences, location, notify } = req.body;
    let locationWKT = null;
    if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      locationWKT = `POINT(${location.longitude} ${location.latitude})`;
    }
    const query = `
      UPDATE users
      SET language = COALESCE($1, language),
          preferences = COALESCE($2::text[], preferences),
          location = COALESCE(ST_GeogFromText($3), location),
          notify = COALESCE($4, notify)
      WHERE id = $5
      RETURNING *
    `;
    const values = [
      language || null,
      preferences || null, // Pass array directly, no JSON.stringify
      locationWKT,
      notify !== undefined ? notify : null,
      req.user.id
    ];
    console.log('Updating profile with values:', values); // Debug log
    const result = await pool.query(query, values);
    req.user = result.rows[0]; // Update session
    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ error: 'Profile update failed', details: err.message });
  }
});

module.exports = router;