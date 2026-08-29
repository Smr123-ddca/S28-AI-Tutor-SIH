const fs = require('fs');
const path = require('path');

function getCourses(req, res) {
    try {
        const coursesPath = path.join(__dirname, '../data/courses.json');
        if (!fs.existsSync(coursesPath)) return res.json({ courses: [] });

        let courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));

        // Ensure non-teachers only see published courses to protect unpublished assets natively
        if (!req.user || req.user.role !== 'teacher') {
            courses = courses.filter(c => c.status === 'published');
        }

        res.json({ courses });
    } catch (error) {
        console.error('Failed to load courses:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load courses.' });
    }
}

function approveCourse(req, res) {
    try {
        const courseName = req.params.courseName;
        const coursesPath = path.join(__dirname, '../data/courses.json');
        if (!fs.existsSync(coursesPath)) return res.status(404).json({ error: 'Courses registry not found' });

        const courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
        const courseIndex = courses.findIndex(c => c.name === courseName);
        if (courseIndex === -1) return res.status(404).json({ error: 'Course not found' });

        const course = courses[courseIndex];
        if (course.status !== 'pending_review' && course.status !== 'needs_revision') {
            return res.status(400).json({ error: `Cannot approve course from state: ${course.status}` });
        }

        course.status = 'approved';
        if (!course.audit) course.audit = {};
        course.audit.approvedAt = new Date().toISOString();
        course.audit.approvedBy = req.user.id;

        fs.writeFileSync(coursesPath, JSON.stringify(courses, null, 2), 'utf8');
        res.json({ status: 'success', course });
    } catch (error) {
        console.error('Failed to approve course:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error while approving course.' });
    }
}

function reviseCourse(req, res) {
    try {
        const courseName = req.params.courseName;
        const { reason } = req.body;

        const coursesPath = path.join(__dirname, '../data/courses.json');
        if (!fs.existsSync(coursesPath)) return res.status(404).json({ error: 'Courses registry not found' });

        const courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
        const courseIndex = courses.findIndex(c => c.name === courseName);
        if (courseIndex === -1) return res.status(404).json({ error: 'Course not found' });

        const course = courses[courseIndex];
        if (course.status !== 'pending_review' && course.status !== 'approved') {
            return res.status(400).json({ error: `Cannot mark revision for course from state: ${course.status}` });
        }

        course.status = 'needs_revision';
        if (!course.audit) course.audit = {};
        course.audit.revisionReason = reason || 'No reason provided';
        course.audit.revisedAt = new Date().toISOString();
        course.audit.revisedBy = req.user.id;

        fs.writeFileSync(coursesPath, JSON.stringify(courses, null, 2), 'utf8');
        res.json({ status: 'success', course });
    } catch (error) {
        console.error('Failed to mark course for revision:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error while marking course for revision.' });
    }
}

function publishCourse(req, res) {
    try {
        const courseName = req.params.courseName;
        const coursesPath = path.join(__dirname, '../data/courses.json');
        if (!fs.existsSync(coursesPath)) return res.status(404).json({ error: 'Courses registry not found' });

        const courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
        const courseIndex = courses.findIndex(c => c.name === courseName);
        if (courseIndex === -1) return res.status(404).json({ error: 'Course not found' });

        const course = courses[courseIndex];

        // Strict state enforcement: Can only publish if APPROVED.
        if (course.status !== 'approved') {
            return res.status(403).json({ error: `Not Authorized: Course must be strictly 'approved' before publication.` });
        }

        course.status = 'published';
        if (!course.audit) course.audit = {};
        course.audit.publishedAt = new Date().toISOString();
        course.audit.publishedBy = req.user.id;

        fs.writeFileSync(coursesPath, JSON.stringify(courses, null, 2), 'utf8');

        // Re-index memory
        const store = require('../data/store');
        store.loadData();

        res.json({ status: 'success', course });
    } catch (error) {
        console.error('Failed to publish course:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error while publishing course.' });
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

function deleteCourse(req, res) {
    try {
        const courseName = req.params.courseName;
        // Strictly prevent path traversal by only allowing a specific courseName parameter natively 
        // Although the registry prevents manual injection typically, sanitization avoids filesystem escapes.
        if (typeof courseName !== 'string' || courseName.includes('/') || courseName.includes('\\') || courseName.includes('..')) {
            return res.status(403).json({ error: 'Invalid course name format' });
        }

        const coursesPath = path.join(__dirname, '../data/courses.json');
        if (!fs.existsSync(coursesPath)) return res.status(404).json({ error: 'Courses registry not found' });

        const courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
        const courseIndex = courses.findIndex(c => c.name === courseName);
        if (courseIndex === -1) return res.status(404).json({ error: 'Course not found' });

        const course = courses[courseIndex];

        // Allowed to delete even if published. We just wipe from memory and file-system natively.
        // 1. Delete associated physical files securely matching the exact artifact names dictated by the engine
        const deletedFiles = [];
        const dataDir = path.join(__dirname, '../data');

        if (fs.existsSync(dataDir)) {
            const allFiles = fs.readdirSync(dataDir);
            allFiles.forEach(file => {
                // Delete any file that matches the course name directly or as a prefix for C1-C6 pipelines (e.g. courseName_chunks.json, courseName_quality.json, courseName.pdf, data.json variants)
                if (file.startsWith(`${course.name}_`) || file === `${course.name}.pdf` || file === `${course.name}.json` || file.startsWith(`${course.name}-`)) {
                    const artifactPath = path.join(dataDir, file);
                    try {
                        fs.unlinkSync(artifactPath);
                        deletedFiles.push(file);
                    } catch (unlinkErr) {
                        console.warn(`Failed to unlink artifact ${file}:`, unlinkErr);
                    }
                }
            });
        }

        // Also ensure explicitly defined legacy artifacts (if they live outside strictly named patterns) get captured if valid
        const legacyArtifacts = [
            course.pdf,
            course.chunks,
            course.prerequisites
        ];

        legacyArtifacts.filter(Boolean).forEach(artifact => {
            const safeBase = path.basename(artifact);
            if (!deletedFiles.includes(safeBase)) {
                const artifactPath = path.join(dataDir, safeBase);
                if (fs.existsSync(artifactPath)) {
                    try {
                        fs.unlinkSync(artifactPath);
                        deletedFiles.push(safeBase);
                    } catch (e) { }
                }
            }
        });

        // 2. Splice from registry
        courses.splice(courseIndex, 1);
        fs.writeFileSync(coursesPath, JSON.stringify(courses, null, 2), 'utf8');

        // 3. Clear memory via store loadData
        const store = require('../data/store');
        store.loadData();

        res.json({
            status: 'success',
            message: 'Course deleted permanently',
            deletedFiles
        });

    } catch (error) {
        console.error('Failed to delete course:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error resolving strict deletion' });
    }
}

module.exports = {
    getCourses,
    approveCourse,
    reviseCourse,
    publishCourse,
    getPrerequisites,
    updatePrerequisites,
    getArtifacts,
    deleteCourse
};