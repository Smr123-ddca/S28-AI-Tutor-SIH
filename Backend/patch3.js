const fs = require('fs');
let c = fs.readFileSync('src/controllers/ingest.controller.js', 'utf8');
c = c.replace(/const PYTHON_PATH =[\s\S]+?python\.exe'\);/, "const PYTHON_PATH = 'python';");
fs.writeFileSync('src/controllers/ingest.controller.js', c);
console.log('PATCHED');
