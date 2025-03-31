const express = require('express');
const router = express.Router();
const Event = require('../models/events');
const { ensureAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { categories, start_date, end_date, latitude, longitude, radius } = req.query;
    const lang = req.isAuthenticated() ? (req.user.language || 'en') : (req.headers['accept-language']?.split(',')[0] || 'en');
    let searchLocation = null;

    // Use user's location if authenticated and no lat/lon provided
    if (req.isAuthenticated() && !latitude && !longitude && req.user.location) {
      searchLocation = req.user.location; // Already a geography type
    } else if (latitude && longitude) {
      searchLocation = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
    }

    const events = await Event.findByFilters({
      categories: categories ? categories.split(',') : null,
      start_date,
      end_date,
      location: searchLocation,
      radius: radius ? parseFloat(radius) : 10000 // Default 10km
    });

    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.titles[lang] || event.titles.en,
      description: event.descriptions[lang] || event.descriptions.en,
      location: event.location,
      event_date: event.event_date,
      categories: event.categories,
      distance: event.distance // Include if location filter used
    }));

    res.json(formattedEvents);
  } catch (err) {
    console.error('Event fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch events', details: err.message });
  }
});

router.post('/', ensureAdmin, async (req, res) => {
  try {
    const { titles, descriptions, location, event_date, categories } = req.body;
    console.log('Raw request body:', req.body);
    console.log('Parsed location:', location);
    if (!titles || !descriptions || !titles.en || !descriptions.en) {
      return res.status(400).json({ error: 'Titles and descriptions must include at least English (en)' });
    }
    if (!location || isNaN(location.latitude) || isNaN(location.longitude)) {
      return res.status(400).json({ error: 'Location must include valid numeric latitude and longitude' });
    }
    const created_by = req.user.id;
    const event = await Event.create({
      titles,
      descriptions,
      location,
      event_date,
      categories,
      created_by
    });
    res.status(201).json({ message: 'Event created', event });
  } catch (err) {
    console.error('Event creation error:', err.message);
    res.status(500).json({ error: 'Event creation failed', details: err.message });
  }
});

module.exports = router;