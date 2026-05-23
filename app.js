const express = require('express');
const path = require('path');
require('dotenv').config();

// validate required env variables on boot
if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is required");
    process.exit(1);
}

const { initDb } = require('./db');
const seed = require('./db/seed');

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

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