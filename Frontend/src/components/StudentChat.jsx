import { useState, useRef, useEffect } from 'react'

function StudentChat({ session }) {
    const [messages, setMessages] = useState([])
    const [question, setQuestion] = useState('')
    const [studentId, setStudentId] = useState('')
    const [sessionId] = useState(() => crypto.randomUUID())
    const [loading, setLoading] = useState(false)

    const [expandedCitations, setExpandedCitations] = useState({})
    const [recordedPQs, setRecordedPQs] = useState({})

    useEffect(() => {
        let storedId;
        try {
            storedId = localStorage.getItem('ai_tutor_student_id');
            if (!storedId) {
                storedId = crypto.randomUUID();
                localStorage.setItem('ai_tutor_student_id', storedId);
            }
        } catch (e) {
            storedId = crypto.randomUUID();
        }
        setStudentId(storedId);
    }, []);

    const toggleCitation = (msgIndex, segIndex) => {
        const key = `${msgIndex}-${segIndex}`
        setExpandedCitations(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    const handlePracticeReport = async (msgIndex, pqIdx, chunkId, correct) => {
        const key = `${msgIndex}-${pqIdx}`;
        try {
            await fetch('/api/session-event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    student_id: studentId,
                    chunk_id: chunkId,
                    correct: correct
                })
            });
            setRecordedPQs(prev => ({ ...prev, [key]: true }));
        } catch (err) {
            console.error('Failed to log error', err);
        }
    };

    const handleSend = async () => {
        if (!question.trim()) return

        const userMsg = { role: 'user', text: question }
        setMessages(prev => [...prev, userMsg])
        setQuestion('')
        setLoading(true)

        try {
            const response = await fetch('/api/explain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    question: userMsg.text,
                    student_id: studentId || undefined,
                    session_id: sessionId
                })
            })

            const data = await response.json()
            setMessages(prev => [...prev, { role: 'bot', ...data }])
        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', status: 'error', message: 'Failed to connect to backend.' }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            <div className="chat-window">
                {messages.map((msg, idx) => {
                    if (msg.role === 'user') {
                        return (
                            <div key={idx} className="bubble bubble-right">
                                {msg.text}
                            </div>
                        )
                    }

                    // Bot responses based on status
                    if (msg.status === 'error') {
                        return (
                            <div key={idx} className="bubble bubble-left bubble-error">
                                {msg.message || 'An error occurred.'}
                            </div>
                        )
                    }

                    if (msg.status === 'guided_mode') {
                        return (
                            <div key={idx} className="bubble bubble-left bubble-guided">
                                {msg.message}
                            </div>
                        )
                    }

                    if (msg.status === 'insufficient_evidence') {
                        return (
                            <div key={idx} className="bubble bubble-left bubble-insufficient">
                                {msg.message}
                            </div>
                        )
                    }

                    if (msg.status === 'answered') {
                        const resultsMap = {}
                        if (msg.results) {
                            msg.results.forEach(r => { resultsMap[r.id] = r.text })
                        }

                        // Extract first chunk_id if available to tie practice questions to it
                        const defaultChunkId = msg.results && msg.results.length > 0 ? msg.results[0].id : null;

                        return (
                            <div key={idx} className="bubble bubble-left bubble-answered" style={{ maxWidth: '100%' }}>
                                {msg.addressed_gap && (
                                    <div className="gap-banner">
                                        Addressing prerequisite: {msg.gap_section_label}
                                    </div>
                                )}

                                {msg.explanation_segments?.map((seg, i) => {
                                    const key = `${idx}-${i}`
                                    const isExpanded = expandedCitations[key]
                                    const fullText = resultsMap[seg.source_chunk_id] || "Source text not returned by API."

                                    return (
                                        <div key={i} style={{ marginBottom: '1rem' }}>
                                            <span>{seg.text}</span>
                                            <span className="citation-tag" onClick={() => toggleCitation(idx, i)}>
                                                {seg.source_chunk_id} {isExpanded ? '▼' : '▶'}
                                            </span>
                                            {isExpanded && (
                                                <div className="citation-content">
                                                    {fullText}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                                {msg.practice_questions && msg.practice_questions.length > 0 && (
                                    <div className="practice-box">
                                        <h4>Practice Questions</h4>
                                        <ul style={{ listStyle: 'none', padding: 0 }}>
                                            {msg.practice_questions.map((pq, pqIdx) => {
                                                const pqKey = `${idx}-${pqIdx}`;
                                                const isRecorded = recordedPQs[pqKey];

                                                return (
                                                    <li key={pqIdx} style={{ marginBottom: '1.25rem' }}>
                                                        <div style={{ marginBottom: '0.5rem' }}>{pq}</div>
                                                        {isRecorded ? (
                                                            <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 'bold' }}>
                                                                Recorded ✓
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button
                                                                    onClick={() => handlePracticeReport(idx, pqIdx, defaultChunkId, true)}
                                                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid #16a34a', background: 'transparent', color: '#16a34a', cursor: 'pointer' }}
                                                                >
                                                                    Got it right
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePracticeReport(idx, pqIdx, defaultChunkId, false)}
                                                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}
                                                                >
                                                                    Got it wrong
                                                                </button>
                                                            </div>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    return null
                })}

                {loading && (
                    <div className="bubble bubble-left bubble-insufficient" style={{ fontStyle: 'italic' }}>
                        Thinking...
                    </div>
                )}
            </div>

            <div className="chat-input-row">
                <input
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ask a question..."
                    disabled={loading}
                />
                <button onClick={handleSend} disabled={loading || !question.trim()}>Send</button>
            </div>
        </div>
    )
}

export default StudentChat
