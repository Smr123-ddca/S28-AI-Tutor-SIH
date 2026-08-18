require('dotenv').config();
const app = require('./src/app');
const { loadData } = require('./src/data/store');

const PORT = process.env.PORT || 3000;

// Start the server and load data
app.listen(PORT, () => {
    console.log(`AI Tutor Backend running on http://localhost:${PORT}`);
    loadData();
});
