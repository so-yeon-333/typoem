const express = require('express');
const path = require('path');
require('dotenv').config();

const seed = require('./db/seed');

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Typoem' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  seed();
  app.listen(PORT, () => {
    console.log(`Typoem running on http://localhost:${PORT}`);
  });
}

module.exports = app;