const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/courses',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer mock-teacher-jwt-token-xyz'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`BODY: ${data}`);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
