const express = require('express');
const session = require('express-session');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const notificationRoutes = require('./routes/notifications');
const { setWebSocketServer } = require('./websocket');

const app = express();
const port = process.env.PORT || 3000;

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'your-jwt-secret'
};
passport.use('jwt', new JwtStrategy(opts, async (jwt_payload, done) => {
  console.log('JWT Strategy - Executing for payload:', jwt_payload);
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [jwt_payload.id]);
    const user = result.rows[0];
    if (user) {
      console.log('JWT Strategy - User found:', { id: user.id, username: user.username });
      return done(null, user);
    }
    console.log('JWT Strategy - No user found for ID:', jwt_payload.id);
    return done(null, false, { message: 'User not found' });
  } catch (err) {
    console.error('JWT Strategy - Error:', err.message);
    return done(err, false);
  }
}));

app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/notifications', notificationRoutes);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Event Locator API is running!');
});


if (require.main === module) {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  setWebSocketServer(server);
}

module.exports = { app };