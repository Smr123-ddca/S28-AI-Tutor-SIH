const fs = require('fs');
const path = require('path');

async function build() {
    const tracePath = path.join(__dirname, 'demo_concepts_trace.json');
    const trace = JSON.parse(fs.readFileSync(tracePath, 'utf8'));

    const targetConcepts = {
        "DSA_Code_Reference_Annotated": [
            { name: "Time Complexity", question: "What is time complexity and why is it important?", expected: "It measures the time an algorithm takes relative to the input size.", hint1: "Think about execution duration.", hint2: "It scales with input size." },
            { name: "Space Complexity", question: "How does space complexity differ from time complexity?", expected: "Space complexity measures the memory required, while time complexity measures the execution time.", hint1: "Think about RAM.", hint2: "Memory vs CPU cycles." },
            { name: "Big-O Notation", question: "What does Big-O notation uniquely represent in algorithm analysis?", expected: "The upper bound or worst-case complexity of an algorithm.", hint1: "Does it represent the best case?", hint2: "It represents the maximum growth rate." }
        ],
        "DBMS_Code_Reference_Annotated": [
            { name: "Database Management System", question: "What is the primary function of a Database Management System (DBMS)?", expected: "To create, manage, and query a database efficiently and securely.", hint1: "It acts as an interface.", hint2: "It handles data storage and retrieval." },
            { name: "Data Independence", question: "Why is Data Independence a critical advantage of a DBMS?", expected: "It allows changes in the schema at one level without affecting the upper levels.", hint1: "Think about modifying data structures.", hint2: "Logical vs Physical separation." },
            { name: "Relational Data Model", question: "What fundamental structure does the Relational Data Model use to store data?", expected: "Tables (or relations) consisting of rows and columns.", hint1: "Think about spreadsheets.", hint2: "Two-dimensional matrices of records." }
        ],
        "Economics_Chunking_Reference": [
            { name: "Scarcity", question: "How does scarcity force societies to make economic choices?", expected: "Resources are limited but wants are infinite, requiring trade-offs.", hint1: "Consider unlimited wants.", hint2: "Not everything can be produced at once." },
            { name: "Opportunity Cost", question: "If you spend an hour studying instead of working for $15, what is the opportunity cost?", expected: "$15 and the experience of working.", hint1: "What did you give up?", hint2: "The next best alternative." },
            { name: "Demand", question: "According to the law of demand, what happens when the price of a good increases?", expected: "The quantity demanded decreases.", hint1: "Think from a consumer's perspective.", hint2: "Higher prices usually discourage purchases." }
        ],
        "IES_Demo_Course_Structured": [
            { name: "Embedded System", question: "What defines an Embedded System compared to a general-purpose computer?", expected: "It performs a dedicated function within a larger mechanical or electrical system.", hint1: "Think about its specific purpose.", hint2: "It is not meant for general computing like a PC." },
            { name: "Real-Time System", question: "What is the primary constraint of a Real-Time System?", expected: "It must respond to inputs within strict, deterministic time constraints.", hint1: "Think about pacemakers.", hint2: "Missing a deadline causes failure." },
            { name: "Harvard Architecture", question: "How does Harvard Architecture differ from Von Neumann Architecture?", expected: "It uses separate memory spaces and buses for instructions and data.", hint1: "Think about memory access.", hint2: "Simultaneous fetching of data and instructions." }
        ]
    };

    let finalSets = {};

    for (const [courseName, requiredConcepts] of Object.entries(targetConcepts)) {
        finalSets[courseName] = [];

        const conceptDefPath = path.join(__dirname, `src/data/${courseName}_concepts.json`);
        let semMap = {};
        if (fs.existsSync(conceptDefPath)) {
            const data = JSON.parse(fs.readFileSync(conceptDefPath));
            const arr = data.concepts || data;
            arr.forEach(c => {
                semMap[c.name.toLowerCase()] = c.concept_id;
            });
        }

        let aliasesInDB = trace[courseName] || [];

        for (let target of requiredConcepts) {
            let alias = semMap[target.name.toLowerCase()];
            let dbId = null;
            if (alias) {
                let match = aliasesInDB.find(db => db.alias === alias);
                if (match) dbId = match.id;
            }

            finalSets[courseName].push({
                question: target.question,
                concept: target.name,
                concept_id: dbId,
                hint_1: target.hint1,
                hint_2: target.hint2,
                expected_answer: target.expected
            });
        }
    }

    fs.writeFileSync(path.join(__dirname, 'src/data/demo_practice_sets.json'), JSON.stringify(finalSets, null, 2));
    console.log("Built explicit demo dataset successfully.");
}

build();
