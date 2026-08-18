const { execSync } = require('child_process');
const fs = require('fs');
const out = execSync('node test-filter.js').toString();
fs.writeFileSync('test-results-utf8.txt', out);
