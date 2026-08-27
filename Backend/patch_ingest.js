const fs = require('fs');
const content = fs.readFileSync('src/controllers/ingest.controller.js', 'utf8');
const newContent = content.replace(/!fs\.existsSync\(\s*PYTHON_PATH\s*\)/g, 'false');
fs.writeFileSync('src/controllers/ingest.controller.js', newContent, 'utf8');
console.log('Patched');
