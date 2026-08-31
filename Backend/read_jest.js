const fs = require('fs');
const content = fs.readFileSync('jest_output.log', 'utf16le');
const lines = content.split('\n');
const failures = lines.filter(l => l.includes('FAIL '));
console.log(failures.join('\n'));
