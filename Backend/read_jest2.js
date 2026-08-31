const fs = require('fs');
const content = fs.readFileSync('jest_output.log', 'utf16le');
const str = content.toString();

const practiceIdx = str.indexOf('FAIL tests/explain.test.js');
const nextIdx = str.indexOf('FAIL ', practiceIdx + 10);
console.log(str.substring(practiceIdx, nextIdx !== -1 ? nextIdx : practiceIdx + 1000));
