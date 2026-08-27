const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../src/data');
const coursesJsonPath = path.join(DATA_DIR, 'courses.json');

const subjects = [
    { name: 'Java', text: 'Java is a high-level, class-based, object-oriented programming language that is designed to have as few implementation dependencies as possible.' },
    { name: 'Python', text: 'Python is a high-level, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant indentation.' },
    { name: 'JavaScript', text: 'JavaScript, often abbreviated as JS, is a programming language that is one of the core technologies of the World Wide Web, alongside HTML and CSS.' },
    { name: 'DSA', text: 'A data structure is a data organization, management, and storage format that enables efficient access and modification. An algorithm is a sequence of rigorous instructions.' },
    { name: 'DBMS', text: 'A database management system (DBMS) is computer software that interacts with end users, applications, and the database itself to capture and analyze the data.' }
];

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const coursesRegistry = [];

try {
    const legacyData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
    fs.writeFileSync(path.join(DATA_DIR, 'Legacy_Physics_chunks.json'), JSON.stringify(legacyData, null, 2), 'utf8');
    fs.writeFileSync(path.join(DATA_DIR, 'Legacy_Physics_prerequisites.json'), JSON.stringify({ status: 'success', course: 'Legacy_Physics', output: { prerequisites: [] } }, null, 2), 'utf8');
    coursesRegistry.push({
        name: 'Legacy_Physics',
        pdf: 'Legacy_Physics_draft.pdf',
        chunks: 'Legacy_Physics_chunks.json',
        prerequisites: 'Legacy_Physics_prerequisites.json',
        status: 'published'
    });
} catch (e) {
    console.log("No legacy data found.");
}

subjects.forEach(subject => {
    const chunkPath = path.join(DATA_DIR, `${subject.name}_chunks.json`);
    const prereqPath = path.join(DATA_DIR, `${subject.name}_prerequisites.json`);

    // Create chunks
    const chunks = [
        {
            id: `chunk_${crypto.randomUUID()}`,
            topic: subject.name,
            section_label: `Introduction to ${subject.name}`,
            text: subject.text
        }
    ];
    fs.writeFileSync(chunkPath, JSON.stringify(chunks, null, 2), 'utf8');

    // Create prereqs (empty for now)
    const prereq = { status: 'success', course: subject.name, output: { prerequisites: [] } };
    fs.writeFileSync(prereqPath, JSON.stringify(prereq, null, 2), 'utf8');

    // Add to registry
    coursesRegistry.push({
        name: subject.name,
        pdf: `${subject.name}_draft.pdf`,
        chunks: `${subject.name}_chunks.json`,
        prerequisites: `${subject.name}_prerequisites.json`,
        status: 'published'
    });
});

fs.writeFileSync(coursesJsonPath, JSON.stringify(coursesRegistry, null, 2), 'utf8');
console.log('✅ Temporary Seed Data created successfully!');
