const fs = require('fs');
const path = require('path');

let courseContentChunks = [];

function loadData() {
    try {
        const filePath = path.join(__dirname, '..', '..', 'data.json');
        const fileData = fs.readFileSync(filePath, 'utf-8');
        courseContentChunks = JSON.parse(fileData);
        console.log(`Successfully loaded ${courseContentChunks.length} CourseContent chunks into memory.`);
    } catch (error) {
        console.error('Error loading data.json:', error);
    }
}

function getChunks() {
    return courseContentChunks;
}

module.exports = {
    loadData,
    getChunks
};
