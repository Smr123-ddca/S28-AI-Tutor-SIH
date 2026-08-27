const fs = require('fs');
let content = fs.readFileSync('src/controllers/ingest.controller.js', 'utf8');
content = content.replace(/let PYTHON_PATH = .+;/g, "let PYTHON_PATH = 'python';");
content = content.replace(/const PYTHON_PATH = .+;/g, "const PYTHON_PATH = 'python';");
fs.writeFileSync('src/controllers/ingest.controller.js', content, 'utf8');
console.log('Patched');
