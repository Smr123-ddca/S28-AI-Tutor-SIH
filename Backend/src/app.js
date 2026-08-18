const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the frontend dashboard from 'public' directory
app.use(express.static('public'));

app.use('/api', apiRoutes);

module.exports = app;
