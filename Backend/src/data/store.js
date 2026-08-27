const fs = require('fs');
const path = require('path');

let courseContentChunks = [];

function loadData() {
    try {
        const coursesPath = path.join(__dirname, '..', 'data', 'courses.json');
        if (!fs.existsSync(coursesPath)) {
            console.log('No courses.json found, checking for legacy data.json fallback...');
            const legacyPath = path.join(__dirname, '..', '..', 'data.json');
            if (fs.existsSync(legacyPath)) {
                courseContentChunks = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
                console.log(`Successfully loaded ${courseContentChunks.length} legacy chunks into memory.`);
            }
            return;
        }

        const coursesList = JSON.parse(fs.readFileSync(coursesPath, 'utf-8'));
        const publishedCourses = coursesList.filter(c => c.status === 'published');

        courseContentChunks = [];
        let loadedCount = 0;

        for (const course of publishedCourses) {
            const chunkFile = path.join(__dirname, '..', 'data', course.chunks);
            if (fs.existsSync(chunkFile)) {
                const chunks = JSON.parse(fs.readFileSync(chunkFile, 'utf-8'));
                // Append course name metadata implicitly to chunks to preserve isolation natively
                const annotatedChunks = chunks.map(c => ({
                    ...c,
                    source_course: course.name
                }));
                courseContentChunks.push(...annotatedChunks);
                loadedCount++;
            }
        }

        console.log(`Successfully loaded ${courseContentChunks.length} chunks from ${loadedCount} published courses into memory.`);
    } catch (error) {
        console.error('Error loading courses data:', error);
    }
}

function getChunks() {
    return courseContentChunks;
}

module.exports = {
    loadData,
    getChunks
};
