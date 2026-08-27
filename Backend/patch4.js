const fs = require('fs');
let c = fs.readFileSync('src/controllers/ingest.controller.js', 'utf8');
let s = c.indexOf('const PYTHON_PATH =');
let e = c.indexOf("python.exe');", s);
if (s !== -1 && e !== -1) {
    c = c.substring(0, s) + "const PYTHON_PATH = 'python';" + c.substring(e + 13);
    fs.writeFileSync('src/controllers/ingest.controller.js', c);
    console.log('PATCHED_SUCCESS');
} else {
    console.log('NOT FOUND', s, e);
}
