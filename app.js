const express = require('express');
const path = require('path');

// for Swagger
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const roomsRouter = require('./routes/rooms');
const dictionaryRouter = require('./routes/dictionary');
const { roomMemosRouter, memosRouter } = require('./routes/memos');
const { roomAnnotationsRouter, annotationsRouter } = require('./routes/annotations');

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/rooms', roomsRouter); 
app.use('/api/rooms', roomMemosRouter);
app.use('/api/memos', memosRouter);
app.use('/api/rooms', roomAnnotationsRouter);
app.use('/api/annotations', annotationsRouter);
app.use('/api/dictionary', dictionaryRouter);


// API docs
const swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Typoem' });
});

module.exports = app;