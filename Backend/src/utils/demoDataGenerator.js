const seedRandom = (seed) => {
    let m_w = seed;
    let m_z = 987654321;
    let mask = 0xffffffff;
    return () => {
        m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
        m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
        let result = ((m_z << 16) + m_w) & mask;
        result /= 4294967296;
        return result + 0.5;
    };
};

function getDeterministicDemoData() {
    const random = seedRandom(12345);

    const subjects = {
        DSA: [
            { id: "concept_dsa_1", name: "Binary Search", misconception: "Students may be applying binary search without considering whether the search space is ordered.", prerequisite: "Sorting / ordered search space" },
            { id: "concept_dsa_2", name: "Time Complexity", misconception: "Assuming that nested loops always mean O(n^2) without checking the loop iterators.", prerequisite: "Basic Algebra" },
            { id: "concept_dsa_3", name: "Arrays", misconception: "Confusing 0-based indexing algorithms when dealing with length or capacity.", prerequisite: "Memory Allocation" }
        ],
        DBMS: [
            { id: "concept_dbms_1", name: "Joins", misconception: "Students may confuse INNER JOIN with LEFT JOIN when rows are missing from one relation.", prerequisite: "Relational matching / primary-foreign key relationships" },
            { id: "concept_dbms_2", name: "Normalization", misconception: "Failing to identify transitive dependencies correctly for 3NF.", prerequisite: "Functional Dependencies" },
            { id: "concept_dbms_3", name: "Primary Keys", misconception: "Believing that primary keys can contain NULL values in standard SQL.", prerequisite: "Tables & Columns" }
        ],
        Economics: [
            { id: "concept_eco_1", name: "Opportunity Cost", misconception: "Students may confuse opportunity cost with the direct monetary price of an option.", prerequisite: "Scarcity" },
            { id: "concept_eco_2", name: "Scarcity", misconception: "Assuming scarcity only applies to physical goods and not time or attention.", prerequisite: "Basic Needs" },
            { id: "concept_eco_3", name: "Demand & Supply", misconception: "Confusing a shift in the demand curve with a movement along the curve.", prerequisite: "Price Mechanisms" }
        ],
        IES: [
            { id: "concept_ies_1", name: "Embedded Systems", misconception: "Students may treat any computer-based device as an embedded system without considering its dedicated-purpose constraints.", prerequisite: "Hardware–software integration" },
            { id: "concept_ies_2", name: "Hardware–Software Integration", misconception: "Forgetting to configure pin directions (I/O) before attempting digital reads and writes.", prerequisite: "Digital Logic" },
            { id: "concept_ies_3", name: "Microcontrollers", misconception: "Confusing RAM capacity with ROM/Flash storage limits on small chips.", prerequisite: "Computer Architecture" }
        ]
    };

    const targetCounts = {
        "Binary Search": 18,
        "Time Complexity": 12,
        "Arrays": 9,
        "Joins": 16,
        "Normalization": 11,
        "Primary Keys": 7,
        "Opportunity Cost": 19,
        "Scarcity": 13,
        "Demand & Supply": 8,
        "Embedded Systems": 15,
        "Hardware–Software Integration": 11,
        "Microcontrollers": 7
    };

    const realisticNames = [
        "Aarav Sharma", "Aditi Mishra", "Aditya Das", "Ananya Patel", "Anika Nair",
        "Arjun Mehta", "Avni Singh", "Ayush Kumar", "Diya Das", "Ishaan Gupta",
        "Isha Nair", "Kavya Reddy", "Karan Singh", "Khushi Sharma", "Krishna Patel",
        "Manav Jain", "Meera Das", "Mihir Kumar", "Nandini Mishra", "Neha Patel",
        "Nikhil Das", "Pooja Sharma", "Pranav Singh", "Priya Nair", "Rahul Kumar",
        "Riya Das", "Rohan Gupta", "Sakshi Mishra", "Samarth Jain", "Sana Khan",
        "Shivam Patel", "Shreya Das", "Sneha Nair", "Tanmay Sharma", "Tanya Gupta",
        "Varun Singh", "Vedika Patel", "Vivek Kumar", "Yash Sharma", "Yashi Das",
        "Aanya Gupta", "Dev Patel", "Harsh Jain", "Ishita Sharma", "Kritika Das",
        "Manya Singh", "Naman Gupta", "Radhika Nair", "Siddharth Kumar", "Simran Patel"
    ];

    const students = [];
    for (let i = 0; i < realisticNames.length; i++) {
        students.push({
            id: `student_${(i + 1).toString().padStart(3, '0')}`,
            name: realisticNames[i],
            signals: []
        });
    }

    const currentCounts = {};
    for (const sub in subjects) {
        subjects[sub].forEach(c => currentCounts[c.name] = 0);
    }

    // Distribute signals targeting specific counts
    for (const sub in subjects) {
        subjects[sub].forEach(concept => {
            const target = targetCounts[concept.name];

            // Randomly select 'target' number of distinct students
            const availableStudents = [...students];
            for (let k = 0; k < target; k++) {
                if (availableStudents.length === 0) break;
                // pick random student
                const rIndex = Math.floor(random() * availableStudents.length);
                const st = availableStudents[rIndex];

                // Assign signal
                st.signals.push({
                    subject: sub,
                    concept_id: concept.id,
                    concept: concept.name,
                    incorrect_attempts: Math.floor(random() * 4) + 2, // 2 to 5 incorrect attempts
                    attention_signal: true,
                    possible_misconception: concept.misconception,
                    possible_prerequisite: concept.prerequisite
                });
                currentCounts[concept.name]++;

                availableStudents.splice(rIndex, 1); // target distinct students per concept
            }
        });
    }

    // Aggregate into a format easy for the frontend
    const concepts = [];
    for (const sub in subjects) {
        subjects[sub].forEach(concept => {
            const count = currentCounts[concept.name];
            concepts.push({
                subject: sub,
                concept_id: concept.id,
                concept: concept.name,
                students_needing_attention: count,
                total_incorrect_attempts: students.reduce((acc, s) => {
                    const sig = s.signals.find(sign => sign.concept_id === concept.id);
                    return acc + (sig ? sig.incorrect_attempts : 0);
                }, 0),
                affected_students: students.filter(s => s.signals.some(sign => sign.concept_id === concept.id)).map(s => s.name),
                possible_misconception: concept.misconception,
                possible_prerequisite: concept.prerequisite
            });
        });
    }

    return {
        is_demo: true,
        summary: {
            total_students: 50,
            tracked_subjects: 4,
            tracked_concepts: 12,
            students_with_signals: students.filter(s => s.signals.length > 0).length
        },
        concepts: concepts,
        students: students
    };
}

module.exports = {
    getDeterministicDemoData
};
