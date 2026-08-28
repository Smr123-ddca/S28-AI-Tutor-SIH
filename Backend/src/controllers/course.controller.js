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

function getPrerequisites(req, res) {
    try {
        const courseName = req.params.courseName;
        const prereqPath = path.join(__dirname, '../data', `${courseName}_prerequisites.json`);

        if (!fs.existsSync(prereqPath)) {
            return res.json({ prerequisites: {} });
        }

        const prereqs = JSON.parse(fs.readFileSync(prereqPath, 'utf8'));
        res.json({ prerequisites: prereqs });
    } catch (error) {
        console.error('Failed to get prerequisites:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
}

function updatePrerequisites(req, res) {
    try {
        const courseName = req.params.courseName;
        const { prerequisites } = req.body;

        if (!prerequisites) return res.status(400).json({ error: 'Missing prerequisites objects' });

        const prereqPath = path.join(__dirname, '../data', `${courseName}_prerequisites.json`);
        fs.writeFileSync(prereqPath, JSON.stringify(prerequisites, null, 2), 'utf8');

        res.json({ status: 'success', prerequisites });
    } catch (error) {
        console.error('Failed to update prerequisites:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
}

function getArtifacts(req, res) {
    try {
        const courseName = req.params.courseName;
        const chunksPath = path.join(__dirname, '../data', `${courseName}_chunks.json`);
        const prereqPath = path.join(__dirname, '../data', `${courseName}_prerequisites.json`);

        let chunks = [];
        let prerequisites = { course: courseName, relationships: [] };

        if (fs.existsSync(chunksPath)) {
            chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));
        }

        if (fs.existsSync(prereqPath)) {
            prerequisites = JSON.parse(fs.readFileSync(prereqPath, 'utf8'));
        }

        res.json({
            status: 'success',
            course: courseName,
            chunks,
            prerequisites
        });
    } catch (error) {
        console.error('Failed to get artifacts:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error resolving artifacts.' });
    }
}

module.exports = {
    getCourses,
    updateCourseStatus,
    getPrerequisites,
    updatePrerequisites,
    getArtifacts
};