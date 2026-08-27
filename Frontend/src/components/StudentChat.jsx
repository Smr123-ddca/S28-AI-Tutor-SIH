import { useState, useRef, useEffect } from 'react'
import './TinyShapes.css' // assuming styles are global or can keep inline


function StudentChat({ session }) {
    const [sessions, setSessions] = useState([])
    const [currentSessionId, setCurrentSessionId] = useState(null)
    const [messages, setMessages] = useState([])
    const [question, setQuestion] = useState('')
    const [studentId, setStudentId] = useState('')
    const [loading, setLoading] = useState(false)

    const [courses, setCourses] = useState([])
    const [courseName, setCourseName] = useState('')

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
    useEffect(() => {
    const loadCourses = async () => {
        try {
            const res = await fetch('/api/courses', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            })

            if (!res.ok) {
                throw new Error(`Failed to load courses: ${res.status}`)
            }

            const data = await res.json()

            setCourses(data.courses || [])

            if (data.courses?.length > 0 && !courseName) {
                setCourseName(data.courses[0].name)
            }

        } catch (error) {
            console.error('Failed to load courses:', error)
        }
    }

    if (session?.access_token) {
        loadCourses()
    }
    }, [session?.access_token])
    useEffect(() => {
        if (studentId && session?.access_token) {
            loadSessions();
        }
    }, [studentId, session?.access_token]);

    const loadSessions = async () => {
        try {
            const res = await fetch('/api/sessions', {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch (e) {
            console.error("Failed to load sessions:", e);
        }
    };

    const handleSelectSession = async (sid) => {
        setCurrentSessionId(sid);
        setMessages([]); // clear current
        setExpandedCitations({});
        setRecordedPQs({});
        try {
            const res = await fetch(`/api/sessions/${sid}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const history = data.messages.map(m => {
                    if (m.role === 'user') return { role: 'user', text: m.content };
                    return { role: 'bot', ...(m.response_json || { status: 'success', message: m.content }) };
                });
                setMessages(history);
            }
        } catch (e) {
            console.error("Failed to load session messages:", e);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setExpandedCitations({});
        setRecordedPQs({});
    };

    const handleRenameTitle = async (sid, title) => {
        const newTitle = prompt("Enter new title:", title);
        if (!newTitle) return;
        try {
            await fetch(`/api/sessions/${sid}/title`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ title: newTitle })
            });
            loadSessions(); // reload titles
        } catch (e) {
            console.error("Rename failed", e);
        }
    };

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
            const res = await fetch('/api/session-event', {
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

            if (!res.ok) return;
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
                studentId: studentId || undefined,
                session_id: currentSessionId || 'untracked',
                courseName: courseName
            })
            })

            const data = await response.json()
            setMessages(prev => [...prev, { role: 'bot', ...data }])

            if (data.session_id && data.session_id !== currentSessionId) {
                setCurrentSessionId(data.session_id);
                loadSessions();
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', status: 'error', message: 'Failed to connect to backend.' }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            height: '100%',
            overflow: 'hidden',
            backgroundColor: '#f9fafb', // Light grey background 
            padding: '1.5rem',
            gap: '1.5rem',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Sidebar Floating Window */}
            <div style={{
                width: '280px',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <button onClick={handleNewChat} style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#ffffff',
                        color: '#111827',
                        fontSize: '1rem',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}>
                        + New Chat
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>Recent history</div>
                    {sessions.map(s => (
                        <div key={s.id}
                            style={{
                                padding: '0.75rem',
                                marginBottom: '0.25rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: currentSessionId === s.id ? '#f3f4f6' : 'transparent',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'background-color 0.15s ease'
                            }}
                        >
                            <span
                                onClick={() => handleSelectSession(s.id)}
                                style={{
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: currentSessionId === s.id ? '#111827' : '#4b5563',
                                    fontWeight: currentSessionId === s.id ? '500' : 'normal',
                                    fontSize: '0.95rem'
                                }}
                            >
                                {s.title || 'Untitled'}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRenameTitle(s.id, s.title); }}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: currentSessionId === s.id ? 1 : 0.4 }}
                                title="Rename"
                            >
                                ✏️
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Floating Window */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                border: '1px solid #e5e7eb',
                position: 'relative'
            }}>
                <div style={{
    padding: '1rem 2rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
}}>
    <label style={{
        fontWeight: '600',
        color: '#374151'
    }}>
        Course:
    </label>

    <select
        value={courseName}
        onChange={(e) => {
            setCourseName(e.target.value)

            // Start a fresh chat when switching courses
            setCurrentSessionId(null)
            setMessages([])
            setExpandedCitations({})
            setRecordedPQs({})
        }}
        style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            background: '#ffffff',
            fontSize: '0.95rem',
            cursor: 'pointer'
        }}
    >
        <option value="">
            Select a course
        </option>

        {courses.map(course => (
            <option
                key={course.name}
                value={course.name}
            >
                {course.name}
            </option>
        ))}
    </select>
</div>
                <div className="chat-window" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                    {messages.length === 0 && !loading && (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '1.2rem', textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>
                                <div>What do you want to learn today?</div>
                            </div>
                        </div>
                    )}
                    {messages.map((msg, idx) => {
                        if (msg.role === 'user') {
                            return (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                                    <div style={{
                                        background: '#f3f4f6',
                                        color: '#111827',
                                        padding: '1rem 1.25rem',
                                        borderRadius: '1.25rem',
                                        maxWidth: '75%',
                                        fontSize: '1.05rem',
                                        lineHeight: '1.5'
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            )
                        }

                        let botContent = null;

                        if (msg.status === 'error') {
                            botContent = <span style={{ color: '#dc2626' }}>{msg.message || 'An error occurred.'}</span>;
                        } else if (msg.status === 'guided_mode') {
                            botContent = <span>{msg.message}</span>;
                        } else if (msg.status === 'insufficient_evidence') {
                            botContent = <span style={{ color: '#d97706' }}>{msg.message}</span>;
                        } else if (msg.status === 'success') {
                            const resultsMap = {}
                            if (msg.results) {
                                msg.results.forEach(r => { resultsMap[r.id] = r.text })
                            }
                            const defaultChunkId = msg.results && msg.results.length > 0 ? msg.results[0].id : null;

                            botContent = (
                                <div style={{ width: '100%' }}>
                                    {msg.addressed_gap && (
                                        <div style={{ background: '#fef3c7', color: '#92400e', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '500' }}>
                                            💡 Addressing prerequisite: {msg.gap_section_label}
                                        </div>
                                    )}

                                    {msg.explanation_segments?.map((seg, i) => {
                                        const key = `${idx}-${i}`
                                        const isExpanded = expandedCitations[key]
                                        const fullText = resultsMap[seg.source_chunk_id] || "Source text not returned by API."

                                        return (
                                            <div key={i} style={{ marginBottom: '1rem' }}>
                                                <span>{seg.text}</span>
                                                <span
                                                    onClick={() => toggleCitation(idx, i)}
                                                    style={{
                                                        marginLeft: '0.5rem',
                                                        fontSize: '0.75rem',
                                                        color: '#6b7280',
                                                        cursor: 'pointer',
                                                        background: '#f3f4f6',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '12px'
                                                    }}
                                                >
                                                    {seg.source_chunk_id} {isExpanded ? '▼' : '▶'}
                                                </span>
                                                {isExpanded && (
                                                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f9fafb', borderLeft: '3px solid #d1d5db', fontSize: '0.9rem', color: '#4b5563' }}>
                                                        {fullText}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}

                                    {msg.practice_questions && msg.practice_questions.length > 0 && (
                                        <div style={{ marginTop: '1.5rem', padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fafafa' }}>
                                            <h4 style={{ margin: '0 0 1rem 0', color: '#111827', fontSize: '0.95rem', alignSelf: 'flex-start' }}>Practice Check</h4>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {msg.practice_questions.map((pq, pqIdx) => {
                                                    const pqKey = `${idx}-${pqIdx}`;
                                                    const isRecorded = recordedPQs[pqKey];

                                                    return (
                                                        <li key={pqIdx} style={{ marginBottom: pqIdx === msg.practice_questions.length - 1 ? 0 : '1.5rem' }}>
                                                            <div style={{ marginBottom: '0.75rem', color: '#374151' }}>{pq}</div>
                                                            {isRecorded ? (
                                                                <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: '600' }}>✓ Recorded feedback</div>
                                                            ) : (
                                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                                    <button onClick={() => handlePracticeReport(idx, pqIdx, defaultChunkId, true)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #16a34a', background: 'transparent', color: '#16a34a', cursor: 'pointer', fontWeight: '500' }}>
                                                                        Got it right
                                                                    </button>
                                                                    <button onClick={() => handlePracticeReport(idx, pqIdx, defaultChunkId, false)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: '500' }}>
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

                        return (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
                                <div style={{
                                    background: 'transparent',
                                    color: '#111827',
                                    maxWidth: '85%',
                                    fontSize: '1.05rem',
                                    lineHeight: '1.6'
                                }}>
                                    {botContent}
                                </div>
                            </div>
                        )
                    })}

                    {loading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
                            <div style={{ color: '#6b7280', fontSize: '1rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="typing-indicator">...</div> Thinking
                            </div>
                        </div>
                    )}
                </div>

                {/* Textarea Floating Container */}
                <div style={{ padding: '0 2rem 2rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '800px',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        background: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                    }}>
                        <textarea
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Message AI Tutor..."
                            disabled={loading}
                            rows={1}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                fontSize: '1.05rem',
                                resize: 'vertical',
                                minHeight: '50px',
                                maxHeight: '300px',
                                padding: '1rem 4rem 1rem 1rem',
                                color: '#111827',
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !question.trim()}
                            style={{
                                position: 'absolute',
                                right: '0.75rem',
                                bottom: '0.75rem',
                                padding: '0.4rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                background: (loading || !question.trim()) ? '#f3f4f6' : '#111827',
                                color: (loading || !question.trim()) ? '#9ca3af' : '#ffffff',
                                border: 'none',
                                cursor: (loading || !question.trim()) ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.2s ease'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StudentChat
