import { useState, useEffect } from 'react';

export default function Practice({ session, refreshPractice }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [answer, setAnswer] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [evalState, setEvalState] = useState(null);
    const [hintText, setHintText] = useState("");
    const [hintsRequested, setHintsRequested] = useState(0);

    const [socraticMode, setSocraticMode] = useState(false);
    const [socraticChat, setSocraticChat] = useState([]);
    const [showAnswerMode, setShowAnswerMode] = useState(false);
    const [answerRevealedText, setAnswerRevealedText] = useState("");

    useEffect(() => {
        if (session?.access_token) {
            fetchPracticeQuestions();
        }
    }, [session]);

    const fetchPracticeQuestions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/practice-questions', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const pending = data.questions ? data.questions.filter(q => q.status === 'pending' && !q.answer_revealed) : [];
                setQuestions(pending);
                if (refreshPractice) refreshPractice();
            }
        } catch (e) {
            console.error("Failed to load practice questions:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectQuestion = (q) => {
        setSelectedQuestion(q);
        setAnswer("");
        setEvalState(null);
        setHintsRequested(q.hints_requested || 0);
        setSocraticMode(false);
        setSocraticChat([]);
        setShowAnswerMode(false);
        setAnswerRevealedText("");

        let preloadedHints = "";
        if (q.hints_requested >= 1 && q.hint_1) preloadedHints += q.hint_1;
        if (q.hints_requested >= 2 && q.hint_2) preloadedHints += '\n\n' + q.hint_2;
        setHintText(preloadedHints);
    };

    const handleRequestHint = async () => {
        if (!selectedQuestion || hintsRequested >= 2) return;
        try {
            const res = await fetch(`/api/practice-questions/${selectedQuestion.id}/hint`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setHintText(prev => prev ? prev + '\n\n' + data.hint : data.hint);
                setHintsRequested(data.hints_requested);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!answer.trim() || !selectedQuestion) return;
        setSubmitting(true);
        setEvalState(null);
        try {
            const endpoint = socraticMode ? `/api/practice-questions/${selectedQuestion.id}/socratic` : '/api/practice-attempts';
            const payload = socraticMode ? { message: answer } : { practice_question_id: selectedQuestion.id, answer: answer };

            if (socraticMode) setSocraticChat(prev => [...prev, { role: 'user', content: answer }]);

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) {
                setEvalState({ type: 'error', message: data.error || 'Failed to evaluate answer.' });
            } else {
                if (socraticMode) {
                    setSocraticChat(prev => [...prev, { role: 'tutor', content: data.message }]);
                    if (data.completed) {
                        setEvalState({ type: 'correct', message: 'You reached the correct answer via tutoring!' });
                        fetchPracticeQuestions();
                    } else {
                        // Clear the input field for next message
                        setAnswer("");
                    }
                } else {
                    setEvalState({ type: data.evaluation, message: `Attempt ${data.attempt_number}` });
                    if (data.completed) {
                        fetchPracticeQuestions();
                    }
                }
            }
            if (!socraticMode) {
                // Do not clear standard answer field automatically mimicking traditional setups
            }
        } catch (e) {
            console.error(e);
            setEvalState({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleContinueTutor = async () => {
        setSocraticMode(true);
        setSubmitting(true);
        try {
            const res = await fetch(`/api/practice-questions/${selectedQuestion.id}/socratic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ message: "I need help. Please guide me." })
            });
            const data = await res.json();
            if (data.success) {
                setSocraticChat([{ role: 'tutor', content: data.message }]);
                setAnswer("");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleShowAnswer = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/practice-questions/${selectedQuestion.id}/reveal`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (data.success) {
                setShowAnswerMode(true);
                setAnswerRevealedText(data.answer);
                setEvalState({ type: 'incorrect', message: 'Answer revealed.' });
                fetchPracticeQuestions();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '10vh' }}>Loading Practice Questions...</div>;
    }

    return (
        <div style={{ padding: '0 1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb',
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: '0 0 0.5rem 0', color: '#111827' }}>Practice</h2>
                        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{questions.length} questions available</span>
                    </div>
                    <div>
                        <select disabled style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', color: '#6b7280', outline: 'none' }}>
                            <option>Physics</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', flex: 1, gap: '2rem' }}>

                    {/* Left pane: Question List */}
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                        {questions.length === 0 ? (
                            <div style={{ color: '#6b7280', textAlign: 'center', marginTop: '2rem' }}>No pending practice questions.</div>
                        ) : (
                            questions.map(q => (
                                <div
                                    key={q.id}
                                    style={{
                                        padding: '1.25rem',
                                        borderRadius: '12px',
                                        border: selectedQuestion?.id === q.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                        cursor: 'pointer',
                                        background: selectedQuestion?.id === q.id ? '#f0f9ff' : '#ffffff',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem'
                                    }}
                                    onClick={() => handleSelectQuestion(q)}
                                >
                                    <div style={{ color: '#111827', fontWeight: '500', fontSize: '1rem', lineHeight: '1.4' }}>
                                        {q.question.length > 80 ? q.question.substring(0, 80) + '...' : q.question}
                                    </div>
                                    <button style={{
                                        alignSelf: 'flex-start',
                                        padding: '0.3rem 0.8rem',
                                        background: '#3b82f6',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}>
                                        Practice
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Right pane: Question Detail */}
                    <div style={{ flex: '2', background: '#f9fafb', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb' }}>
                        {selectedQuestion ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                        Subject: {selectedQuestion.subject === 'temporary-subject' ? 'General' : selectedQuestion.subject}
                                    </span>
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#4b5563', fontSize: '0.9rem', textTransform: 'uppercase' }}>Question</h3>
                                    <div style={{ color: '#111827', fontSize: '1.15rem', fontWeight: '500', lineHeight: '1.6' }}>
                                        {selectedQuestion.question}
                                    </div>
                                </div>
                                {selectedQuestion.concept && (
                                    <div>
                                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#4b5563', fontSize: '0.9rem', textTransform: 'uppercase' }}>Concept</h3>
                                        <div style={{ color: '#374151', fontSize: '1rem', lineHeight: '1.5' }}>
                                            {selectedQuestion.concept}
                                        </div>
                                    </div>
                                )}

                                {hintText && (
                                    <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#92400e', fontSize: '0.9rem', textTransform: 'uppercase' }}>Hint</h3>
                                        <div style={{ color: '#92400e', fontSize: '1rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                            {hintText}
                                        </div>
                                    </div>
                                )}

                                <hr style={{ border: 'none', borderTop: '1px solid #d1d5db', margin: '1rem 0' }} />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                                    {showAnswerMode ? (
                                        <div style={{ padding: '1.25rem', background: '#ffe4e6', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                                            <h3 style={{ margin: '0 0 0.5rem 0', color: '#be123c', fontSize: '1rem', textTransform: 'uppercase' }}>Revealed Answer</h3>
                                            <div style={{ color: '#881337', fontSize: '1.05rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                                {answerRevealedText}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {socraticMode && (
                                                <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                                                    {socraticChat.map((msg, idx) => (
                                                        <div key={idx} style={{
                                                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                            background: msg.role === 'user' ? '#3b82f6' : '#e5e7eb',
                                                            color: msg.role === 'user' ? '#ffffff' : '#1f2937',
                                                            padding: '0.6rem 0.9rem',
                                                            borderRadius: '8px',
                                                            maxWidth: '80%'
                                                        }}>
                                                            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.2rem' }}>{msg.role === 'user' ? 'You' : 'Socratic Tutor'}</div>
                                                            {msg.content}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <textarea
                                                value={answer}
                                                onChange={e => setAnswer(e.target.value)}
                                                disabled={submitting || evalState?.type === 'correct'}
                                                placeholder={socraticMode ? "Reply to tutor..." : "Type your answer here..."}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '120px',
                                                    padding: '1rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid #d1d5db',
                                                    fontFamily: 'inherit',
                                                    fontSize: '1rem',
                                                    resize: 'vertical',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            {evalState && !showAnswerMode && (
                                                <div style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.95rem',
                                                    fontWeight: '600',
                                                    background: evalState.type === 'correct' ? '#dcfce7' : evalState.type === 'partial' ? '#fef9c3' : evalState.type === 'error' ? '#fee2e2' : '#fee2e2',
                                                    color: evalState.type === 'correct' ? '#166534' : evalState.type === 'partial' ? '#854d0e' : evalState.type === 'error' ? '#991b1b' : '#991b1b'
                                                }}>
                                                    {evalState.type === 'correct' && "✓ Correct! "}
                                                    {evalState.type === 'partial' && "⚠️ Partially correct. "}
                                                    {evalState.type === 'incorrect' && "❌ Not quite. "}
                                                    {evalState.type === 'error' && "⚠️ Error: "}
                                                    <span style={{ fontWeight: 'normal' }}>{evalState.message}</span>
                                                </div>
                                            )}

                                            {evalState && (evalState.type === 'incorrect' || evalState.type === 'partial') && !showAnswerMode && (
                                                <div style={{ marginTop: '0.75rem' }}>
                                                    {!socraticMode && hintsRequested === 0 && (
                                                        <button
                                                            onClick={handleRequestHint}
                                                            style={{ padding: '0.4rem 1rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                                                        >Get Hint 1</button>
                                                    )}
                                                    {!socraticMode && hintsRequested === 1 && (
                                                        <button
                                                            onClick={handleRequestHint}
                                                            style={{ padding: '0.4rem 1rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                                                        >Get Hint 2</button>
                                                    )}
                                                    {hintsRequested >= 2 && !socraticMode && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            <div style={{ color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic' }}>Both hints used.</div>
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button
                                                                    onClick={handleContinueTutor}
                                                                    style={{ padding: '0.4rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                                                                >Continue with Tutor</button>
                                                                <button
                                                                    onClick={handleShowAnswer}
                                                                    style={{ padding: '0.4rem 1rem', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                                                                >Show Answer</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {socraticMode && (
                                                        <div style={{ marginTop: '0.5rem' }}>
                                                            <button
                                                                onClick={handleShowAnswer}
                                                                style={{ padding: '0.4rem 1rem', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                                                            >Show Answer</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {!showAnswerMode && (
                                            <button
                                                onClick={handleSubmitAnswer}
                                                disabled={submitting || !answer.trim() || evalState?.type === 'correct'}
                                                style={{
                                                    padding: '0.6rem 1.5rem',
                                                    background: (submitting || !answer.trim() || evalState?.type === 'correct') ? '#9ca3af' : '#111827',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '0.95rem',
                                                    fontWeight: '500',
                                                    cursor: (submitting || !answer.trim() || evalState?.type === 'correct') ? 'not-allowed' : 'pointer',
                                                    transition: 'background-color 0.2s'
                                                }}
                                            >
                                                {submitting ? "Evaluating..." : evalState?.type === 'correct' ? 'Completed' : (socraticMode ? 'Send' : 'Submit Answer')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                Select a question from the list to begin practicing.
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
