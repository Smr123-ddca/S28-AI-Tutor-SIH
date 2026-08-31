const fs = require('fs');
const content = fs.readFileSync('jest_output.log', 'utf16le').toString();

function extract(name) {
    const idx = content.indexOf(`FAIL ${name}`);
    if (idx === -1) return '';
    const nextIdx = content.indexOf('FAIL ', idx + 10);
    return content.substring(idx, nextIdx !== -1 ? nextIdx : idx + 3000);
}

fs.writeFileSync('extracted_errors.txt', extract('tests/explain.test.js') + '\n\n' + extract('tests/layer5.test.js') + '\n\n' + extract('tests/layer6.test.js'));
