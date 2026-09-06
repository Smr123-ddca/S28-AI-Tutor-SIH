require('dotenv').config();
const { generateWithFallback } = require('./src/services/llm.router.js');

async function test() {
    console.log("STARTING TEST");
    try {
        const result = await generateWithFallback('Hi, this is a test', 'EXPLAIN_MODE');
        console.log("SUCCESS:", result);
    } catch (error) {
        console.error("ERROR:", error);
    }
}
test();
