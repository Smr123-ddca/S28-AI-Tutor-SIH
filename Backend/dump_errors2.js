const fs = require('fs');
const content = fs.readFileSync('jest_output_3.log', 'utf16le').toString();
const matches = content.match(/FAIL tests\/[a-zA-Z0-9_.]+.js[\s\S]+?(?=^\s*FAIL|Test Suites:)/gm);

if (matches) {
    fs.writeFileSync('extracted_errors_clean.txt', matches.join('\n\n======================\n\n'));
} else {
    console.log("No matches found");
}
