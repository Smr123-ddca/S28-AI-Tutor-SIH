import { useState, useRef, useEffect } from 'react'
import './TinyShapes.css' // assuming styles are global or can keep inline

function StudentChat({ session, refreshPractice }) {
    const [sessions, setSessions] = useState([])
    const [currentSessionId, setCurrentSessionId] = useState(null)
    const [messages, setMessages] = useState([])
    const [question, setQuestion] = useState('')
    const [loading, setLoading] = useState(false)

    const [expandedCitations, setExpandedCitations] = useState({})
    const [recordedPQs, setRecordedPQs] = useState({})
    const [pendingClarification, setPendingClarification] = useState(null)
    const [editingSessionId, setEditingSessionId] = useState(null)
    const [editTitle, setEditTitle] = useState("")
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)
    const messagesEndRef = useRef(null)
    const chatContainerRef = useRef(null)

    const scrollToBottom = () => {
        if (!chatContainerRef.current) return;
        const { scrollHeight, scrollTop, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 150;

        if (isNearBottom && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [currentSessionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    useEffect(() => {
        if (session?.access_token) {
            loadSessions();
        }
    }, [session?.access_token]);

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
        setPendingClarification(null);
        try {
            const res = await fetch(`/api/sessions/${sid}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const history = data.messages.map(m => {
                    if (m.role === 'user') return { role: 'user', text: m.content };
                    return { role: 'bot', ...(m.response_json || { status: 'answered', message: m.content }) };
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
        setPendingClarification(null);
    };

    const handleRenameTitle = async (sid, title) => {
        if (!title.trim()) {
            setEditingSessionId(null);
            return;
        }
        try {
            await fetch(`/api/sessions/${sid}/title`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ title })
            });
            setSessions(prev => prev.map(s => s.id === sid ? { ...s, title } : s));
        } catch (err) {
            console.error("Failed to rename session", err);
        }
        setEditingSessionId(null);
    };

    const handleDeleteSession = async (sid) => {
        try {
            const res = await fetch(`/api/sessions/${sid}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            if (res.ok) {
                setSessions(prev => prev.filter(s => s.id !== sid));
                if (currentSessionId === sid) {
                    handleNewChat();
                }
            } else {
                console.error("Failed to delete session");
            }
        } catch (err) {
            console.error("Failed to delete session", err);
        }
        setConfirmDeleteId(null);
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

    const handleSend = async (overrideQuestion = null) => {
        const textToSend = typeof overrideQuestion === 'string' ? overrideQuestion : question;
        if (!textToSend.trim()) return

        const userMsg = { role: 'user', text: textToSend }
        setMessages(prev => [...prev, userMsg])

        // Only clear input if we were sending from the input box
        if (typeof overrideQuestion !== 'string') {
            setQuestion('')
        }

        setLoading(true)

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const payload = {
                question: userMsg.text,
                session_id: currentSessionId || 'untracked'
            };

            if (pendingClarification) {
                payload.clarification_context = {
                    original_question: pendingClarification.originalQuestion
                };
            }

            const response = await fetch('/api/explain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await response.json()
            setMessages(prev => [...prev, { role: 'bot', ...data }])

            // Manage pending clarification state
            if (data.status === 'clarification') {
                if (!pendingClarification) {
                    setPendingClarification({ originalQuestion: userMsg.text });
                }
                // If it already existed, keep the original question
            } else {
                setPendingClarification(null);
            }

            if (data.session_id && data.session_id !== currentSessionId) {
                setCurrentSessionId(data.session_id);
                loadSessions();
            }

            if (data.practice && data.practice.available) {
                setMessages(prev => [...prev, { role: 'bot_meta', message: `${data.practice.count} practice questions available` }]);
                if (refreshPractice) refreshPractice();
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                setMessages(prev => [...prev, { role: 'bot', status: 'error', message: 'The AI Tutor took too long to respond. Please try asking your question again.' }]);
            } else {
                setMessages(prev => [...prev, { role: 'bot', status: 'error', message: 'Failed to connect to backend.' }]);
            }
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
                                background: currentSessionId === s.id ? '#f3f4f6' : 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'background-color 0.15s ease'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {editingSessionId === s.id ? (
                                    <input
                                        autoFocus
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        onBlur={() => setEditingSessionId(null)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                handleRenameTitle(s.id, editTitle.trim() || 'Untitled');
                                            } else if (e.key === 'Escape') {
                                                setEditingSessionId(null);
                                            }
                                        }}
                                        style={{ flex: 1, padding: '0.2rem', borderRadius: '4px', border: '1px solid #d1d5db', outline: 'none' }}
                                    />
                                ) : (
                                    <span
                                        onClick={() => handleSelectSession(s.id)}
                                        style={{
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            color: currentSessionId === s.id ? '#111827' : '#4b5563',
                                            fontWeight: currentSessionId === s.id ? '500' : 'normal',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {s.title || 'Untitled'}
                                    </span>
                                )}
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingSessionId(s.id); setEditTitle(s.title || 'Untitled'); }}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: currentSessionId === s.id ? 1 : 0.4 }}
                                        title="Rename"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(s.id); }}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: currentSessionId === s.id ? 1 : 0.4, paddingLeft: '4px' }}
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            {confirmDeleteId === s.id && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#dc2626', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: '#fee2e2', padding: '0.5rem', borderRadius: '6px' }}>
                                    <span>Permanently delete this chat?</span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} style={{ flex: 1, background: '#e5e7eb', border: 'none', borderRadius: '4px', padding: '2px 0', cursor: 'pointer', color: '#374151' }}>Cancel</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 0', cursor: 'pointer' }}>Delete</button>
                                    </div>
                                </div>
                            )}
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
                <div ref={chatContainerRef} className="chat-window" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
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

                        if (msg.role === 'bot_meta') {
                            return (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ background: '#bfdbfe', color: '#1e3a8a', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500' }}>
                                        💡 {msg.message}
                                    </div>
                                </div>
                            );
                        }

                        if (msg.status === 'error') {
                            botContent = <span style={{ color: '#dc2626' }}>{msg.message || 'An error occurred.'}</span>;
                        } else if (msg.status === 'guided_mode') {
                            botContent = <span>{msg.message}</span>;
                        } else if (msg.status === 'insufficient_evidence') {
                            const refusalText = msg.message || "I couldn't find enough information about this in your course material, so I can't answer it based on the provided syllabus.";
                            botContent = (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 'bold', textTransform: 'uppercase' }}>Insufficient evidence</span>
                                    <span style={{ color: '#d97706' }}>{refusalText}</span>
                                </div>
                            );
                        } else if (msg.status === 'clarification') {
                            const options = msg.clarification?.options || [];
                            botContent = (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <span>{msg.message}</span>
                                    {options.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            {options.map((opt, optIdx) => (
                                                <button
                                                    key={optIdx}
                                                    onClick={() => handleSend(opt)}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '20px',
                                                        border: '1px solid #d1d5db',
                                                        background: '#ffffff',
                                                        color: '#374151',
                                                        fontSize: '0.9rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#9ca3af'; e.currentTarget.style.background = '#f9fafb'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#ffffff'; }}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        } else if (msg.status === 'answered') {
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
                    <div ref={messagesEndRef} />
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
