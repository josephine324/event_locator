const express = require('express');
const session = require('express-session');
const passport = require('./middleware/passport');
const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const notificationRoutes = require('./routes/notifications'); // Add this
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/notifications', notificationRoutes); // Add this

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).send('Server error');
  }
});

app.get('/', (req, res) => {
  res.send('Event Locator API is running!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});