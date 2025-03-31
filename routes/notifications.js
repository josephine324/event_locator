const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const query = `
      SELECT n.id, n.event_id, n.message, n.is_read, n.created_at, 
             e.titles, e.descriptions, e.location, e.event_date, e.categories
      FROM notifications n
      JOIN events e ON n.event_id = e.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
    `;
    const result = await pool.query(query, [req.user.id]);
    const lang = req.user.language || 'en';
    const notifications = result.rows.map(n => ({
      id: n.id,
      event_id: n.event_id,
      message: n.message,
      is_read: n.is_read,
      created_at: n.created_at,
      event: {
        title: n.titles[lang] || n.titles.en,
        description: n.descriptions[lang] || n.descriptions.en,
        location: n.location,
        event_date: n.event_date,
        categories: n.categories
      }
    }));
    res.json(notifications);
  } catch (err) {
    console.error('Notification fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/:id/read', ensureAuthenticated, async (req, res) => {
  try {
    const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [req.params.id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification marked as read', notification: result.rows[0] });
  } catch (err) {
    console.error('Notification update error:', err.message);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;