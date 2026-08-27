const fs = require('fs');
const path = require('path');

function getCourses(req, res) {
    try {
        const coursesPath = path.join(__dirname, '../data/courses.json');
        if (!fs.existsSync(coursesPath)) return res.json({ courses: [] });

        const courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
        res.json({ courses });
    } catch (error) {
        console.error('Failed to load courses:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load courses.' });
    }
}

function updateCourseStatus(req, res) {
    try {
        const courseName = req.params.courseName;
        const { status } = req.body;

        const validStatuses = ['pending_review', 'approved', 'published'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const coursesPath = path.join(__dirname, '../data/courses.json');
        if (!fs.existsSync(coursesPath)) {
            return res.status(404).json({ error: 'Courses registry not found' });
        }

        const courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
        const courseIndex = courses.findIndex(c => c.name === courseName);

        if (courseIndex === -1) {
            return res.status(404).json({ error: 'Course not found' });
        }

        courses[courseIndex].status = status;
        fs.writeFileSync(coursesPath, JSON.stringify(courses, null, 2), 'utf8');

        // Dynamically re-index global Memory if published
        if (status === 'published') {
            const store = require('../data/store');
            store.loadData();
        }

        res.json({ status: 'success', course: courses[courseIndex] });
    } catch (error) {
        console.error('Failed to update course status:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error while updating course.' });
    }
}

module.exports = {
    getCourses,
    updateCourseStatus
};