const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getCourses } = require('../src/controllers/course.controller');

const req = {
    user: {
        role: 'teacher'
    }
};
const res = {
    json: (data) => console.log(JSON.stringify(data, null, 2)),
    status: (code) => ({ json: (d) => console.log(`STATUS ${code}:`, d) })
};
getCourses(req, res).catch(console.error);
