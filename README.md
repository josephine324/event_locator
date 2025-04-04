# Event Locator
This is a simple app that helps you create, find, and manage events near you. You can sign up, log in, post events, review them, favorite the ones you like, and get notified about nearby events—all in one place. It’s built with Node.js, Express, PostgreSQL, and uses JWT for secure logins.

# How to Set It Up
## What you need
* Node.js (v16 or higher)
* PostgreSQL
* Visual Studio code

# Steps
1. Clone the repo
```
git clone <your-repo-url>
cd event_locator
```
2. Install dependencies
```
npm install
```
3. Set Up PostgreSQL
```
CREATE DATABASE event_locator;
```
* Run these SQL commands to create the tables (adjust as needed):
```
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  location GEOGRAPHY(POINT),
  preferences JSONB DEFAULT '{}',
  language TEXT DEFAULT 'en',
  is_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  titles JSONB NOT NULL,
  descriptions JSONB NOT NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  event_date DATE NOT NULL,
  categories TEXT[] NOT NULL,
  created_by INTEGER REFERENCES users(id)
);

CREATE TABLE reviews (
  user_id INTEGER REFERENCES users(id),
  event_id INTEGER REFERENCES events(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

CREATE TABLE favorites (
  user_id INTEGER REFERENCES users(id),
  event_id INTEGER REFERENCES events(id),
  PRIMARY KEY (user_id, event_id)
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  event_id INTEGER REFERENCES events(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE blacklisted_tokens (
  token TEXT PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL
);
```
5. Start the app in your terminal
```
npm run start
```


