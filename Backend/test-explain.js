require('dotenv').config();
const { explain } = require('./src/controllers/explain.controller');
const { loadData } = require('./src/data/store');

async function run() {
    loadData();
    const req = { body: { question: "What is Newton's second law?" } };
    const res = {
        status: (c) => { console.log("Status:", c); return res; },
        json: (data) => console.log("JSON Response:", JSON.stringify(data, null, 2))
    };
    await explain(req, res);
}
run();
