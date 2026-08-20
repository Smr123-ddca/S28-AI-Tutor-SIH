import { useState, useRef } from 'react'

function StudentChat({ session }) {
    const [messages, setMessages] = useState([])
    const [question, setQuestion] = useState('')
    const [studentId, setStudentId] = useState('s1')
    const [loading, setLoading] = useState(false)

    const [expandedCitations, setExpandedCitations] = useState({})

    const toggleCitation = (msgIndex, segIndex) => {
        const key = `${msgIndex}-${segIndex}`
        setExpandedCitations(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

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
                    student_id: studentId || undefined
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
            <div className="top-chat-controls">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Student ID:</label>
                <input
                    className="student-id-field"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="e.g. s1"
                />
            </div>

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
                                        <ul>
                                            {msg.practice_questions.map((pq, pqIdx) => (
                                                <li key={pqIdx}>{pq}</li>
                                            ))}
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
