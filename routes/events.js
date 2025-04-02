const express = require('express');
const router = express.Router();
const Event = require('../models/events');
const passport = require('passport');

router.post('/', async (req, res) => {
  const { titles, descriptions, location, event_date, categories } = req.body;
  try {
    const event = await Event.create({
      titles,
      descriptions,
      location,
      event_date,
      categories,
      created_by: 1 
    });
    res.status(201).json({ message: 'Event created', event });
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: 'Event creation failed', details: err.message });
  }
});

router.post('/:id/review', passport.authenticate('jwt', { session: false, failWithError: true }), async (req, res) => {
  const { id } = req.params;
  const { rating, review } = req.body;
  const user_id = req.user.id;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  try {
    const newReview = await Event.addReview({ user_id, event_id: id, rating, review });
    res.status(201).json({ message: 'Review submitted', review: newReview });
  } catch (err) {
    console.error('Review error:', err.message);
    res.status(400).json({ error: 'Review submission failed', details: err.message });
  }
}, (err, req, res) => {
  res.status(401).json({ error: 'Unauthorized', details: err.message });
});

router.get('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  try {
    const reviews = await Event.getReviews(id);
    res.json(reviews);
  } catch (err) {
    console.error('Get reviews error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reviews', details: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const events = await Event.findAllWithLocations();
    console.log('GET /events - Sending events:', events);
    res.json(events);
  } catch (err) {
    console.error('GET /events - Error:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/:id/favorite', passport.authenticate('jwt', { session: false, failWithError: true }), async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  try {
    await Event.addFavorite(user_id, id);
    res.status(201).json({ message: 'Event added to favorites' });
  } catch (err) {
    console.error('Favorite error:', err.message);
    res.status(400).json({ error: 'Failed to add favorite', details: err.message });
  }
}, (err, req, res) => {
  res.status(401).json({ error: 'Unauthorized', details: err.message });
});

router.get('/favorites', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const user_id = req.user.id;
  try {
    const favorites = await Event.getFavorites(user_id);
    res.json(favorites);
  } catch (err) {
    console.error('Get favorites error:', err.message);
    res.status(500).json({ error: 'Failed to fetch favorites', details: err.message });
  }
});

module.exports = router;