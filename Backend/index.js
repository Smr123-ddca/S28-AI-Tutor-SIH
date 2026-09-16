require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3002;

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Tutor Backend running on port ${PORT}`);
});
