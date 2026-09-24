require('dotenv').config({ path: __dirname + '/../../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DEMO_STUDENT_ID = '3d999019-498e-4d72-a4c2-dc194c25948a';

const subjectsData = [
    {
        subject: 'Economics',
        concepts: ['Opportunity Cost', 'Scarcity'],
        chatSessions: [
            {
                title: "Understanding Opportunity Cost",
                chats: [
                    { role: 'user', content: "Is opportunity cost just the price of something?" },
                    { role: 'assistant', content: "Not quite. Let's think about what you give up when you choose one option over another.\n\nSuppose you have two hours and can either study for an exam or work a paid shift.\n\nIf you choose to study, what is the main alternative you gave up?", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "The money I could have earned?" },
                    { role: 'assistant', content: "Exactly. That forgone alternative is part of the opportunity cost.\n\nNow try this: if the work shift would have paid ₹500, but you also would have gained valuable work experience, would the opportunity cost necessarily be only ₹500?", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "No, it could include the value of the alternative I gave up." },
                    { role: 'assistant', content: "Good. You're identifying the key idea: opportunity cost is about the value of the next-best alternative, not simply the sticker price of what you choose.", response_json: { status: 'answered' } }
                ]
            },
            {
                title: "Opportunity Cost vs Price",
                chats: [
                    { role: 'user', content: "Opportunity cost is basically the amount of money something costs, right?" },
                    { role: 'assistant', content: "There's an important distinction here.\n\nYou're connecting opportunity cost directly with monetary price.\n\nLet's test that idea.\n\nIf a free college lecture requires you to give up two hours of paid work, is the opportunity cost zero?", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "No... I guess it could be the wages I gave up." },
                    { role: 'assistant', content: "Exactly.\n\nThe monetary price of an option and the opportunity cost of choosing it are not necessarily the same thing.\n\nYour answer suggests a possible misconception:\nyou may be treating opportunity cost as the direct price of an option rather than the value of the next-best alternative.\n\nLet's try one short example to check whether the distinction is clear.", response_json: { status: 'answered' } }
                ]
            },
            {
                title: "Practice Opportunity Cost",
                chats: [
                    { role: 'user', content: "I think I understand opportunity cost now.\nCan you give me a question?" },
                    {
                        role: 'assistant', content: "Absolutely. Let's test the idea.", response_json: {
                            status: 'answered',
                            practice_questions: [{
                                question: "You have two hours available. You can either: A) Study for an exam. B) Work a shift earning ₹400. C) Watch a movie. You choose to study. What is the opportunity cost of your decision?\n\nA. The cost of your textbook\nB. ₹400 and the value of the next-best alternative\nC. The amount of time spent studying\nD. Zero, because studying is free",
                                expected_answer: "B",
                                concept: "Opportunity Cost",
                                hint_1: "What is the single most valuable alternative given up?"
                            }]
                        }
                    }
                ]
            }
        ],
        practice: [
            {
                concept: 'Opportunity Cost',
                questions: [
                    {
                        question: "If a company spends its budget on expanding a factory instead of research, what is the opportunity cost?",
                        hint_1: "Consider what the budget could have alternatively produced.",
                        struggle: true,
                        hints: 0,
                        incorrectLast: true
                    }
                ]
            }
        ]
    },
    {
        subject: 'DSA',
        concepts: ['Binary Search', 'Time Complexity'],
        chatSessions: [
            {
                title: "Why Binary Search Is O(log n)",
                chats: [
                    { role: 'user', content: "Why is binary search O(log n)?" },
                    { role: 'assistant', content: "Let's reason it out instead of memorizing the formula.\n\nImagine 16 sorted elements.\n\nAfter one comparison, approximately how many elements remain in the search space?", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "8." },
                    { role: 'assistant', content: "And after another comparison?", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "4." },
                    { role: 'assistant', content: "Then 2, then 1.\n\nSo the search space is repeatedly divided by two.\n\nHow many times can you divide n by 2 before reaching 1?", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "log n?" },
                    { role: 'assistant', content: "Exactly. That's why the number of comparisons grows logarithmically with n.", response_json: { status: 'answered' } }
                ]
            },
            {
                title: "Binary Search Mistake",
                chats: [
                    { role: 'user', content: "Binary search works on any array because it keeps cutting the array in half." },
                    { role: 'assistant', content: "You're correctly identifying the halving behavior, but there's an important condition missing.\n\nWhat property does the array need for us to decide which half can be discarded?", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "It needs to be sorted." },
                    { role: 'assistant', content: "Right.\n\nYour earlier statement suggests a possible misconception:\nyou may be associating binary search with halving alone, without considering the ordering requirement.\n\nLet's test it with an unsorted array.", response_json: { status: 'answered' } }
                ]
            },
            {
                title: "Time Complexity Practice",
                chats: [
                    { role: 'user', content: "Give me a time complexity question." },
                    { role: 'assistant', content: "Try this:\n\nfor i in range(n):\n    print(i)\n\nWhat is the time complexity?\n\nA. O(1)\nB. O(log n)\nC. O(n)\nD. O(n²)\n\nChoose an option first. Don't worry about being wrong.", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "D." },
                    { role: 'assistant', content: "Not quite.\n\nLet's inspect the loop.\n\nHow many times does the loop body execute as n increases?", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "n times." },
                    { role: 'assistant', content: "Exactly.\n\nSo the correct answer is C — O(n).\n\nThe useful part isn't just the answer: count how the number of operations grows with the input.", response_json: { status: 'answered' } }
                ]
            }
        ],
        practice: []
    },
    {
        subject: 'DBMS',
        concepts: ['Joins'],
        chatSessions: [
            {
                title: "Understanding INNER JOIN",
                chats: [
                    { role: 'user', content: "What is the exact answer to this SQL question?\nSELECT ..." },
                    { role: 'assistant', content: "I can help you work it out, but I won't give you the final answer immediately.\n\nFirst identify what the query is asking for.\n\nWhich rows should remain when a record exists in both tables?", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "Only matching rows?" },
                    { role: 'assistant', content: "Right.\n\nNow look at the JOIN type in the question.\n\nWhat kind of JOIN keeps only matching rows from both sides?", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "INNER JOIN." },
                    { role: 'assistant', content: "Exactly. Now apply that idea to the query.", response_json: { status: 'answered', is_coaching: true } }
                ]
            },
            {
                title: "JOIN Practice Challenge",
                chats: [
                    { role: 'user', content: "Can you give me a JOIN question?" },
                    {
                        role: 'assistant', content: "Sure.", response_json: {
                            status: 'answered',
                            practice_questions: [{
                                question: "Table Students: id | name. Table Enrollments: student_id | course_id. You want every student who is enrolled in at least one course. Which JOIN would naturally keep only students that have a matching enrollment record?\n\nA. INNER JOIN\nB. LEFT JOIN\nC. CROSS JOIN\nD. SELF JOIN",
                                expected_answer: "A"
                            }]
                        }
                    }
                ]
            }
        ],
        practice: [
            {
                concept: 'Joins',
                questions: [
                    {
                        question: "Which of the following SQL statements will return only the rows that have matching values in both tables?",
                        hint_1: "Focus on the keyword that requires matches on both sides.",
                        expected_answer: "INNER JOIN",
                        struggle: false,
                        hints: 0,
                        incorrectLast: false
                    },
                    {
                        question: "If a LEFT JOIN is used, what happens to rows in the left table that do not match the right table?",
                        hint_1: "They are still included, but what values are placed in the columns of the right table?",
                        expected_answer: "They are included with NULL values for right table columns.",
                        struggle: true,
                        hints: 1,
                        incorrectLast: false
                    }
                ]
            }
        ]
    },
    {
        subject: 'IES',
        concepts: ['Embedded Systems'],
        chatSessions: [
            {
                title: "What Makes a System Embedded?",
                chats: [
                    { role: 'user', content: "Is a laptop an embedded system?" },
                    { role: 'assistant', content: "Let's reason from the purpose of the device.\n\nWhat is a laptop designed to do?\n\nIs it built primarily for one dedicated function, or is it intended to run many different applications?", response_json: { status: 'answered', is_coaching: true } },
                    { role: 'user', content: "Many different applications." },
                    { role: 'assistant', content: "Exactly.\n\nNow compare that with the controller inside a washing machine. Its software is designed around a specific function.\n\nThat distinction helps us identify the role of an embedded system.", response_json: { status: 'answered' } }
                ]
            },
            {
                title: "Hardware and Software Integration",
                chats: [
                    { role: 'user', content: "Hardware and software are basically separate parts, so embedded systems only need the hardware to work." },
                    { role: 'assistant', content: "There's an important misconception in that statement.\n\nThe hardware provides the physical components, but the software controls how those components behave.\n\nIn an embedded system, the two work together to perform the device's intended function.\n\nPossible misconception:\ntreating hardware and software as independent rather than interdependent parts of an embedded system.", response_json: { status: 'answered' } }
                ]
            }
        ],
        practice: [
            {
                concept: 'Embedded Systems',
                questions: [
                    {
                        question: "Which feature typically distinguishes an embedded system from a general-purpose computer?",
                        hint_1: "Consider what the system is designed to do.",
                        expected_answer: "Dedicated function",
                        struggle: false,
                        hints: 0,
                        incorrectLast: false
                    },
                    {
                        question: "In a digital microwave, which component represents the embedded system running the timer and power levels?",
                        hint_1: "It refers to the hardware unit containing the processor and software.",
                        expected_answer: "Microcontroller",
                        struggle: false,
                        hints: 0,
                        incorrectLast: false
                    }
                ]
            }
        ]
    }
];

async function seed() {
    console.log("Starting Demo Student Seeder...");

    // WIPE EXISTING DATA for the demo student to ensure deterministic state
    await supabaseAdmin.from('practice_attempts').delete().eq('student_id', DEMO_STUDENT_ID);
    await supabaseAdmin.from('practice_questions').delete().eq('student_id', DEMO_STUDENT_ID);
    const sessionQuery = await supabaseAdmin.from('chat_sessions').select('id').eq('student_id', DEMO_STUDENT_ID);
    const existingSessions = sessionQuery.data || [];
    if (existingSessions.length > 0) {
        await supabaseAdmin.from('chat_messages').delete().in('session_id', existingSessions.map(d => d.id));
    }
    await supabaseAdmin.from('chat_sessions').delete().eq('student_id', DEMO_STUDENT_ID);

    console.log("Cleared existing demo student data.");

    const { data: defaultChunk } = await supabaseAdmin.from('chunks').select('id').limit(1).single();
    const fallbackChunkId = defaultChunk ? defaultChunk.id : null;

    let messageCt = 0, practiceCt = 0, attemptCt = 0;

    for (const subjectData of subjectsData) {
        // 1. CHAT SESSIONS
        for (const chat of subjectData.chatSessions) {
            const { data: session, error: sErr } = await supabaseAdmin.from('chat_sessions').insert({
                student_id: DEMO_STUDENT_ID,
                title: chat.title,
                course: subjectData.subject
            }).select().single();

            if (sErr || !session) throw new Error("Chat session insert failed " + JSON.stringify(sErr));

            for (const msg of chat.chats) {
                // If it's a tutor message, its text must natively reside inside the JSON payload to survive the frontend ChatStream mapper
                let finalJson = {};

                if (msg.role === 'assistant') {
                    finalJson = { ...(msg.response_json || { status: 'answered' }) };
                    // If explanation_segments doesn't exist, we must use `message` (mapped to botMessage in UI)
                    if (!finalJson.explanation_segments) {
                        finalJson.explanation_segments = [{ text: msg.content }];
                    }
                }

                const { error: msgErr } = await supabaseAdmin.from('chat_messages').insert({
                    session_id: session.id,
                    role: msg.role,
                    content: msg.role === 'assistant' ? 'Attached Explanation' : msg.content,
                    response_json: finalJson
                });
                if (msgErr) throw new Error("Msg insert failed " + JSON.stringify(msgErr));
                messageCt++;
            }
        }

        // 2. PRACTICE SESSIONS
        // practice doesn't explicitly group by session in UI except for UI routing? Or does it?
        // Let's create a dedicated chat_session acting as a 'practice session wrapper' 
        const { data: pSession, error: pErr } = await supabaseAdmin.from('chat_sessions').insert({
            student_id: DEMO_STUDENT_ID,
            title: `${subjectData.subject} Practice Challenge`,
            course: subjectData.subject
        }).select().single();

        if (pErr || !pSession) throw new Error("Practice session insert failed " + JSON.stringify(pErr));

        const practiceQuestionsObj = [];

        for (const pConcept of subjectData.practice) {
            for (const q of pConcept.questions) {
                const { data: questionDb, error: qErr } = await supabaseAdmin.from('practice_questions').insert({
                    student_id: DEMO_STUDENT_ID,
                    session_id: pSession.id,
                    chunk_id: fallbackChunkId,
                    subject: subjectData.subject,
                    concept: pConcept.concept,
                    question: q.question,
                    hint_1: q.hint_1,
                    hint_2: "A secondary hint to consider...",
                    status: q.incorrectLast ? 'pending' : 'completed',
                    hints_requested: q.hints || 0,
                    completed_at: q.incorrectLast ? null : new Date().toISOString()
                }).select().single();

                if (qErr || !questionDb) throw new Error("Question insert failed " + JSON.stringify(qErr));
                practiceCt++;

                practiceQuestionsObj.push({
                    concept: pConcept.concept,
                    question: q.question,
                    hint_1: q.hint_1,
                    expected_answer: q.expected_answer
                });

                let attemptNum = 1;

                if (q.struggle) {
                    // Generate a prior incorrect attempt
                    await supabaseAdmin.from('practice_attempts').insert({
                        practice_question_id: questionDb.id,
                        student_id: DEMO_STUDENT_ID,
                        answer: "I am not sure, maybe it's just standard procedure?",
                        evaluation: 'incorrect',
                        attempt_number: attemptNum++,
                        hints_used: 0,
                        tutor_response: "Not quite. Think closer about the underlying mechanics.",
                        answer_revealed: false
                    });
                    attemptCt++;
                }

                if (q.hints > 0) {
                    // Hint provided in UI state (hints_used is tracked)
                }

                if (!q.incorrectLast) {
                    // Generate the final correct attempt
                    await supabaseAdmin.from('practice_attempts').insert({
                        practice_question_id: questionDb.id,
                        student_id: DEMO_STUDENT_ID,
                        answer: q.expected_answer, // perfect match
                        evaluation: 'correct',
                        attempt_number: attemptNum,
                        hints_used: q.hints || 0,
                        tutor_response: "Exactly right! Excellent job.",
                        answer_revealed: false
                    });
                    attemptCt++;
                } else {
                    // Generate another incorrect attempt matching the analytics narrative
                    await supabaseAdmin.from('practice_attempts').insert({
                        practice_question_id: questionDb.id,
                        student_id: DEMO_STUDENT_ID,
                        answer: "The price paid to buy the thing.",
                        evaluation: 'incorrect',
                        attempt_number: attemptNum,
                        hints_used: q.hints || 0,
                        tutor_response: "Remember, it's not the monetary price, but the value of the alternative you didn't choose.",
                        answer_revealed: false
                    });
                    attemptCt++;
                }
            }
        }

        // Wrap the generated Practice objects inside a conversational session so they render natively in the UI
        if (practiceQuestionsObj.length > 0) {
            let conversationalMessages = [];
            switch (subjectData.subject) {
                case 'DBMS':
                    conversationalMessages = [
                        { role: 'user', content: 'What is the difference between INNER JOIN and LEFT JOIN?' },
                        {
                            role: 'assistant',
                            content: 'Attached Explanation',
                            response_json: {
                                status: 'answered',
                                explanation_segments: [{ text: 'An INNER JOIN returns only rows where the join condition matches in both tables.\n\nA LEFT JOIN keeps every row from the left table, even when there is no matching row on the right. When there is no match, the right-side columns are returned as NULL.\n\nThink of it this way:\n\nINNER JOIN → only matching records\n\nLEFT JOIN → everything from the left + matching records from the right.' }],
                                is_coaching: true
                            }
                        },
                        { role: 'user', content: 'So if I have 100 students but only 70 of them are enrolled in a course, what happens with each JOIN?' },
                        {
                            role: 'assistant',
                            content: 'Attached Explanation',
                            response_json: {
                                status: 'answered',
                                explanation_segments: [{ text: 'Exactly the kind of example that makes the difference clear.\n\nSuppose Students contains all 100 students and Enrollments contains records for only 70 of them.\n\nWith an INNER JOIN, you would get the 70 students who have matching enrollment records.\n\nWith a LEFT JOIN starting from Students, you would get all 100 students.\n\nFor the 30 students without an enrollment, the columns coming from Enrollments would be NULL.\n\nSo the key question is:\n\nDo you want only matches, or do you want to preserve every record from the left table?' }],
                                is_coaching: true
                            }
                        },
                        { role: 'user', content: 'Okay, I think I understand. Give me a quick practice question.' },
                        {
                            role: 'assistant',
                            content: 'Attached Explanation',
                            response_json: {
                                status: 'answered',
                                explanation_segments: [{ text: 'Here is a specific scenario to test your understanding:' }],
                                practice_questions: practiceQuestionsObj,
                                is_coaching: true
                            }
                        }
                    ];
                    break;
                case 'IES':
                    conversationalMessages = [
                        { role: 'user', content: 'What makes an embedded system different from a normal computer?' },
                        {
                            role: 'assistant',
                            content: 'Attached Explanation',
                            response_json: {
                                status: 'answered',
                                explanation_segments: [{ text: 'An embedded system is generally designed to perform a specific function or a specific set of functions as part of a larger device.\n\nA general-purpose computer, such as a laptop, is designed to run many different applications.\n\nFor example:\n\nA laptop can run a browser, editor, games and many other programs.\n\nA washing-machine controller is designed primarily to control the washing machine\'s operation.\n\nSo the important distinction is the intended role of the system.' }],
                                is_coaching: true
                            }
                        },
                        { role: 'user', content: 'So does an embedded system need both hardware and software?' },
                        {
                            role: 'assistant',
                            content: 'Attached Explanation',
                            response_json: {
                                status: 'answered',
                                explanation_segments: [{ text: 'Yes.\n\nThe hardware provides the physical components needed by the system, such as the processor, memory, sensors and interfaces.\n\nThe software determines how those components behave.\n\nFor example, in a washing machine, sensors can detect conditions such as water level, while the embedded software uses those inputs to control the machine\'s behavior.\n\nSo hardware and software work together to perform the device\'s intended function.\n\nThis is why hardware–software integration is an important part of embedded systems.' }],
                                is_coaching: true
                            }
                        },
                        { role: 'user', content: 'Got it. Can you give me a quick practice question?' },
                        {
                            role: 'assistant',
                            content: 'Attached Explanation',
                            response_json: {
                                status: 'answered',
                                explanation_segments: [{ text: 'Let\'s test this out with a core identification question:' }],
                                practice_questions: practiceQuestionsObj,
                                is_coaching: false
                            }
                        }
                    ];
                    break;
                default:
                    conversationalMessages = [
                        { role: 'user', content: `Can I do a practice challenge for ${subjectData.subject}?` },
                        {
                            role: 'assistant',
                            content: 'Attached Explanation',
                            response_json: {
                                status: 'answered',
                                explanation_segments: [{ text: 'Absolutely! I have prepared a few questions for you to test your knowledge.' }],
                                practice_questions: practiceQuestionsObj,
                                is_coaching: true
                            }
                        },
                        { role: 'user', content: `For the first one, I think the answer is ${practiceQuestionsObj[0].expected_answer}.` },
                        {
                            role: 'assistant',
                            content: 'Attached Explanation',
                            response_json: {
                                status: 'answered',
                                explanation_segments: [{ text: 'Exactly right! Excellent job. You have mastered this concept.' }],
                                is_coaching: true
                            }
                        },
                        { role: 'user', content: 'What about the second one?' },
                        {
                            role: 'assistant',
                            content: 'Attached Explanation',
                            response_json: {
                                status: 'answered',
                                explanation_segments: [{ text: 'Think closer about the underlying mechanics. Consider the hints on the card and try again!' }],
                                is_coaching: true
                            }
                        }
                    ];
            }

            for (const cm of conversationalMessages) {
                await supabaseAdmin.from('chat_messages').insert({
                    session_id: pSession.id,
                    role: cm.role,
                    content: cm.content,
                    response_json: cm.response_json || {}
                });
                messageCt++;
            }
        }
    } // End of subjectsData loop

    console.log(`Demo seed complete!`);
    console.log(`Inserted ${messageCt} messages inside Chat Sessions.`);
    console.log(`Inserted ${practiceCt} practice questions inside Practice Sessions.`);
    console.log(`Inserted ${attemptCt} practice attempts.`);
}
seed().catch(err => {
    require('fs').writeFileSync('error_trace.txt', typeof err === 'string' ? err : err.message || JSON.stringify(err));
    console.error("Wrote error to error_trace.txt");
    process.exit(1);
});
