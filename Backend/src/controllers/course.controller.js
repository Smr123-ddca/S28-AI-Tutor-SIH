const fs = require('fs');
const path = require('path');

function getCourses(req, res) {
    try {
        const coursesPath = path.join(
            __dirname,
            '../data/courses.json'
        );

        const courses = JSON.parse(
            fs.readFileSync(coursesPath, 'utf8')
        );

        res.json({
            courses: courses.map(course => ({
                name: course.name
            }))
        });

    } catch (error) {
        console.error('Failed to load courses:', error);

        res.status(500).json({
            status: 'error',
            message: 'Failed to load courses.'
        });
    }
}

module.exports = {
    getCourses
};