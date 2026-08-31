const fs = require('fs');
try {
    const data = JSON.parse(fs.readFileSync('./jest-report.json', 'utf8'));
    data.testResults.forEach(tr => {
        tr.assertionResults.forEach(ar => {
            if (ar.status === 'failed') {
                console.log('FAIL:', ar.fullName);
                console.log(ar.failureMessages.join('\n'));
                console.log('---');
            }
        });
    });
} catch (e) { console.error('Error:', e); }
