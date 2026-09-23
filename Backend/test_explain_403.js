const http = require('http');

const data = JSON.stringify({
    question: "What is economics?",
    subject: "Economics",
    class_id: "dcb2c4de-ea57-434a-82d2-f5342ba5a08d",
    student_id: "3d999019-498e-4d72-a4c2-dc194c25948a"
});

const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/explain',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': 'Bearer mock-student-jwt-token-xyz'
    }
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('BODY:', body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
