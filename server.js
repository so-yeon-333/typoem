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

const app = require('./app');
const { initDb } = require('./db');
const seed = require('./db/seed');

const PORT = process.env.PORT || 3000;

initDb()
    .then(() => seed())
    .then(() => {
        app.listen(PORT, () => console.log(`Typoem running on http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error('Failed to start:', err);
        process.exit(1);
    });