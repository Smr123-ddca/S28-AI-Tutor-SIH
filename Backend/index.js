require('dotenv').config();
const app = require('./src/app');
const { loadData } = require('./src/data/store');

const PORT = process.env.PORT || 3002;

// Start the server and load data
app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Tutor Backend running on port ${PORT}`);
    loadData();
});
