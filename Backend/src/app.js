const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api.routes');

const app = express();

const whitelist = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:5173'];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve the frontend dashboard from 'public' directory
app.use(express.static('public'));

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'learnify-backend',
        environment: process.env.NODE_ENV || 'production'
    });
});

app.use('/api', apiRoutes);

module.exports = app;
