const fs = require('fs');
const content = fs.readFileSync('score_test.txt', 'utf8');
const lines = content.split('\n');
lines.forEach(l => console.log(l));
