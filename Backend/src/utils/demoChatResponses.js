function checkDemoChatOverride(question, subject) {
    if (!question || !subject) return null;

    const qLower = question.trim().toLowerCase();
    const subjUpper = subject.trim().toUpperCase();

    // ---------------------------------------------------------
    // DSA
    // ---------------------------------------------------------
    if (subjUpper === 'DSA') {
        // Q1: Normal
        if (qLower === "why is binary search o(log n)?") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "Binary search repeatedly cuts the search space in half.\n\nFor example:\n\n16 → 8 → 4 → 2 → 1\n\nEach comparison removes roughly half of the remaining elements. The number of times you can halve n before reaching 1 grows logarithmically, so binary search runs in O(log n) time." }
                ],
                is_coaching: false
            };
        }
        // Q2: Guided + Misconception
        if (qLower === "can binary search work on any array because it keeps cutting it in half?") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "You're noticing the important halving step. But let's check one condition first.\n\nSuppose the array is:\n\n[7, 2, 9, 1, 5]\n\nIf we compare the middle element and decide to discard one half, how would we know which half contains the value we're looking for?\n\nThis points to the key requirement: binary search relies on an ordered search space." }
                ],
                is_coaching: true,
                misconceptions: [
                    {
                        concept: "Binary Search Applicability",
                        description: "Your question suggests a possible misconception: connecting binary search only with repeatedly halving the data, while overlooking the ordering requirement."
                    }
                ]
            };
        }
        // Q3: Practice
        if (qLower === "give me a quick binary search question.") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "Here is a quick practice question to test your understanding." }
                ],
                practice_questions: [{
                    concept: 'Binary Search Step Tracking',
                    question: "Given the sorted array:\n\n[2, 5, 8, 12, 16, 21, 30]\n\nYou are searching for 16 using binary search.\n\nWhich element is checked first?\n\nA. 5\nB. 12\nC. 16\nD. 21",
                    hint_1: "Consider what the middle element of the 7-element array is.",
                    expected_answer: "B",
                    explanation: "The first comparison is with the middle element. Once 12 is found to be smaller than 16, the search continues in the right half."
                }],
                is_coaching: false
            };
        }
    }

    // ---------------------------------------------------------
    // DBMS
    // ---------------------------------------------------------
    if (subjUpper === 'DBMS') {
        // Q1: Normal
        if (qLower === "what is the difference between inner join and left join?") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "An INNER JOIN keeps rows where matching records exist in both tables.\n\nA LEFT JOIN keeps every row from the left table and includes matching information from the right table when available.\n\nSo the key difference is what happens to rows without a match." }
                ],
                is_coaching: false
            };
        }
        // Q2: Guided + Misconception
        if (qLower === "does inner join keep every row from both tables?") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "Let's reason about it.\n\nImagine the Students table contains a student who has not enrolled in any course.\n\nIf we use INNER JOIN, should that student appear if there is no matching enrollment row?\n\nNo.\n\nAn INNER JOIN keeps only rows where the join condition finds a match." }
                ],
                is_coaching: true,
                misconceptions: [
                    {
                        concept: "INNER JOIN row preservation",
                        description: "Your question suggests a possible misconception: treating INNER JOIN as if it preserves all rows from both tables. That behavior is closer to what you would investigate with an OUTER JOIN."
                    }
                ]
            };
        }
        // Q3: Practice
        if (qLower === "give me a quick join question.") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "Here is a quick practice question to test your understanding." }
                ],
                practice_questions: [{
                    concept: 'INNER vs LEFT Joins',
                    question: "Students contains every registered student.\nEnrollments contains only students who enrolled in a course.\n\nYou want only students who have at least one matching enrollment.\n\nWhich JOIN should you use?\n\nA. INNER JOIN\nB. LEFT JOIN\nC. CROSS JOIN\nD. SELF JOIN",
                    hint_1: "Which join drops left-side records when there is no matching right-side record?",
                    expected_answer: "A",
                    explanation: "INNER JOIN returns rows where the join condition matches in both tables."
                }],
                is_coaching: false
            };
        }
    }

    // ---------------------------------------------------------
    // ECONOMICS
    // ---------------------------------------------------------
    if (subjUpper === 'ECONOMICS') {
        // Q1: Normal
        if (qLower === "what is opportunity cost?") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "Opportunity cost is the value of the next-best alternative you give up when you make a choice.\n\nFor example, if you choose to study instead of working a paid shift, the opportunity cost includes the value of the work opportunity you gave up." }
                ],
                is_coaching: false
            };
        }
        // Q2: Guided + Misconception
        if (qLower === "is opportunity cost just the price of something?") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "Let's separate two ideas.\n\nThe price of something is what you pay to obtain it.\n\nNow imagine a student chooses to study for two hours instead of working a ₹500 shift.\n\nDid the student pay ₹500 to study?\n\nNo.\n\nBut they gave up the opportunity to earn ₹500.\n\nThat forgone alternative is part of the opportunity cost." }
                ],
                is_coaching: true,
                misconceptions: [
                    {
                        concept: "Opportunity Cost Definition",
                        description: "Your question suggests a possible misconception: treating opportunity cost as the direct monetary price of an option rather than the value of the next-best alternative."
                    }
                ]
            };
        }
        // Q3: Practice
        if (qLower === "give me a quick opportunity cost question.") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "Here is a quick practice question to test your understanding." }
                ],
                practice_questions: [{
                    concept: 'Opportunity Cost Identification',
                    question: "You have two hours available.\n\nYou can:\n\nA. Study for an exam\nB. Work a shift earning ₹500\nC. Watch a movie\n\nYou choose to study.\n\nWhat is the opportunity cost?\n\nA. The cost of your textbook\nB. The ₹500 opportunity you gave up\nC. The two hours spent studying\nD. Zero",
                    hint_1: "What was the most valuable alternative that you decided NOT to do in order to study?",
                    expected_answer: "B",
                    explanation: "Opportunity cost is based on the value of the next-best alternative that was forgone."
                }],
                is_coaching: false
            };
        }
    }

    // ---------------------------------------------------------
    // IES / EMBEDDED SYSTEMS
    // ---------------------------------------------------------
    if (subjUpper === 'IES' || subjUpper === 'EMBEDDED SYSTEMS') {
        // Q1: Normal
        if (qLower === "what distinguishes an embedded system from a general-purpose computer?") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "An embedded system is generally designed around a specific function or set of functions within a larger device.\n\nA general-purpose computer is designed to run many different applications.\n\nFor example, a washing machine controller is an embedded system, while a laptop is a general-purpose computer." }
                ],
                is_coaching: false
            };
        }
        // Q2: Guided + Misconception
        if (qLower === "are hardware and software basically separate in an embedded system?") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "Let's think about what actually makes the device perform its function.\n\nThe hardware provides components such as the processor, memory and sensors.\n\nBut what determines how those components behave?\n\nThe software.\n\nSo the device depends on both working together." }
                ],
                is_coaching: true,
                misconceptions: [
                    {
                        concept: "Hardware/Software Interdependence",
                        description: "Your question suggests a possible misconception: treating the hardware and software as independent parts rather than as interacting components of an embedded system."
                    }
                ]
            };
        }
        // Q3: Practice
        if (qLower === "give me a quick embedded systems question.") {
            return {
                status: 'answered',
                explanation_segments: [
                    { text: "Here is a quick practice question to test your understanding." }
                ],
                practice_questions: [{
                    concept: 'Embedded System Examples',
                    question: "Which of the following is the best example of an embedded system?\n\nA. A desktop PC used for many applications\nB. A washing machine controller\nC. A general-purpose laptop\nD. A cloud server",
                    hint_1: "Look for the computing mechanism built inside a larger host appliance meant for one primary goal.",
                    expected_answer: "B",
                    explanation: "The controller is designed to perform a dedicated function within the washing machine."
                }],
                is_coaching: false
            };
        }
    }

    // Default: Return null if no predefined demo matches
    return null;
}

module.exports = {
    checkDemoChatOverride
};
