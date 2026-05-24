const express = require('express');
const path = require('path');
require('dotenv').config();

// validate required env variables on boot
if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is required");
    process.exit(1); // kill run
}
if (!process.env.JWT_EXPIRES_IN) {
    console.error("JWT_EXPIRES_IN is required");
    process.exit(1);
}

const { initDb } = require('./db');
const seed = require('./db/seed');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Typoem' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  initDb()
    .then(() => seed())
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Typoem running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start:', err);
      process.exit(1);
    });
}

module.exports = app;