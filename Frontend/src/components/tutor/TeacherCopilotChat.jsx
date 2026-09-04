import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, RefreshCw, AlertCircle, TrendingUp, HelpCircle } from 'lucide-react';
import { askTeacherCopilot } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const EXAMPLE_PROMPTS = [
    { label: "📊 Weekly summary", query: "Weekly summary" },
    { label: "⚠️ Top errors this week", query: "Top errors this week" },
    { label: "🔍 Who is struggling with Arrays?", query: "Who is struggling with Arrays?" }
];

export function TeacherCopilotChat() {
    const { session } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSendMessage = async (textToSend) => {
        const text = (textToSend || input).trim();
        if (!text || loading) return;

        if (text.length > 500) {
            setMessages(prev => [
                ...prev,
                { id: Date.now(), role: 'error', text: 'Message is too long. Please keep it under 500 characters.' }
            ]);
            return;
        }

        const userMsg = {
            id: Date.now(),
            role: 'teacher',
            text
        };

        setMessages(prev => [...prev, userMsg]);
        if (!textToSend) setInput('');
        setLoading(true);

        try {
            const data = await askTeacherCopilot(text, session?.access_token);
            const botMsg = {
                id: Date.now() + 1,
                role: 'copilot',
                text: data.reply || data.answer || "I received your request.",
                intent: data.intent,
                isError: !!data.error
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            console.error('[TeacherCopilot] Chat error:', err);
            const errorMsg = {
                id: Date.now() + 1,
                role: 'error',
                text: err.message || "Something went wrong communicating with Teacher Co-pilot. Please try again."
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        setInput('');
    };

    return (
        <div
            className="card-white"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '560px',
                padding: '0',
                overflow: 'hidden',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--color-border)',
                boxShadow: 'var(--shadow-md)',
                backgroundColor: '#ffffff'
            }}
        >
            {/* ── Header ── */}
            <div
                style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-offwhite)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--color-orange)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-orange)'
                        }}
                    >
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-ink)', lineHeight: 1.2 }}>
                            Teacher Co-pilot
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                            Instant answers grounded in class practice & diagnostics
                        </div>
                    </div>
                </div>

                {messages.length > 0 && (
                    <button
                        type="button"
                        onClick={handleClearChat}
                        title="Reset Chat"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: 'var(--color-text-muted)',
                            padding: '0.35rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'transparent',
                            transition: 'color var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-orange)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                    >
                        <RefreshCw size={13} />
                        Clear
                    </button>
                )}
            </div>

            {/* ── Messages Container ── */}
            <div
                style={{
                    flex: 1,
                    padding: '1.25rem',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    backgroundColor: '#ffffff'
                }}
            >
                {/* Empty State */}
                {messages.length === 0 && (
                    <div
                        style={{
                            margin: 'auto',
                            maxWidth: '440px',
                            textAlign: 'center',
                            padding: '1.5rem 1rem'
                        }}
                    >
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '16px',
                                backgroundColor: 'var(--color-orange-subtle)',
                                color: 'var(--color-orange)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1rem'
                            }}
                        >
                            <Sparkles size={24} />
                        </div>
                        <h4
                            style={{
                                fontSize: '1.05rem',
                                fontWeight: 700,
                                color: 'var(--color-ink)',
                                marginBottom: '0.4rem'
                            }}
                        >
                            Ask your Class Co-pilot
                        </h4>
                        <p
                            style={{
                                fontSize: '0.85rem',
                                color: 'var(--color-text-secondary)',
                                marginBottom: '1.25rem',
                                lineHeight: 1.45
                            }}
                        >
                            Query struggling students, weekly performance, or common mistakes across your course cohort in real time.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Suggested Prompts
                            </div>
                            {EXAMPLE_PROMPTS.map((item, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSendMessage(item.query)}
                                    style={{
                                        padding: '0.6rem 0.9rem',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'var(--color-offwhite)',
                                        border: '1px solid var(--color-border)',
                                        textAlign: 'left',
                                        fontSize: '0.84rem',
                                        fontWeight: 600,
                                        color: 'var(--color-ink)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--color-orange-subtle)';
                                        e.currentTarget.style.borderColor = 'var(--color-orange)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--color-offwhite)';
                                        e.currentTarget.style.borderColor = 'var(--color-border)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message Stream */}
                {messages.map((msg) => {
                    const isTeacher = msg.role === 'teacher';
                    const isError = msg.role === 'error' || msg.isError;

                    return (
                        <div
                            key={msg.id}
                            style={{
                                display: 'flex',
                                justifyContent: isTeacher ? 'flex-end' : 'flex-start',
                                alignItems: 'flex-start',
                                gap: '0.65rem'
                            }}
                        >
                            {!isTeacher && (
                                <div
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '8px',
                                        backgroundColor: isError ? 'var(--color-red-light)' : 'var(--color-purple-light)',
                                        color: isError ? 'var(--color-red)' : 'var(--color-ink)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        marginTop: '2px'
                                    }}
                                >
                                    {isError ? <AlertCircle size={15} /> : <Bot size={15} />}
                                </div>
                            )}

                            <div
                                style={{
                                    maxWidth: '82%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: isTeacher
                                        ? '16px 16px 4px 16px'
                                        : '16px 16px 16px 4px',
                                    backgroundColor: isTeacher
                                        ? 'var(--color-ink)'
                                        : isError
                                            ? '#fef2f2'
                                            : 'var(--color-offwhite)',
                                    color: isTeacher
                                        ? '#ffffff'
                                        : isError
                                            ? '#991b1b'
                                            : 'var(--color-text-primary)',
                                    border: isTeacher
                                        ? 'none'
                                        : isError
                                            ? '1px solid #fca5a5'
                                            : '1px solid var(--color-border)',
                                    fontSize: '0.88rem',
                                    lineHeight: 1.45,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    boxShadow: isTeacher ? 'var(--shadow-sm)' : 'none'
                                }}
                            >
                                {msg.text}
                            </div>
                        </div>
                    );
                })}

                {/* Loading State Indicator */}
                {loading && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            alignSelf: 'flex-start'
                        }}
                    >
                        <div
                            style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--color-purple-light)',
                                color: 'var(--color-ink)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <Sparkles size={15} className="animate-spin" />
                        </div>
                        <div
                            style={{
                                padding: '0.65rem 1rem',
                                borderRadius: '16px 16px 16px 4px',
                                backgroundColor: 'var(--color-offwhite)',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.84rem',
                                color: 'var(--color-text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <span>Analyzing class diagnostic data</span>
                            <span style={{ display: 'inline-flex', gap: '3px' }}>
                                <span className="animate-pulse">.</span>
                                <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                                <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                            </span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ── Input Bar ── */}
            <div
                style={{
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-offwhite)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem'
                }}
            >
                <div style={{ flex: 1, position: 'relative' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value.slice(0, 500))}
                        onKeyDown={handleKeyDown}
                        placeholder={loading ? "Analyzing..." : "Ask a question (e.g. 'Weekly summary', 'Who is struggling with Normalization?')..."}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '0.7rem 1rem',
                            borderRadius: 'var(--radius-full)',
                            border: '1.5px solid var(--color-border)',
                            backgroundColor: '#ffffff',
                            color: 'var(--color-text-primary)',
                            fontSize: '0.86rem',
                            outline: 'none',
                            transition: 'border-color var(--transition-fast)'
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-orange)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    />
                </div>

                <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || loading}
                    style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: input.trim() && !loading ? 'var(--color-orange)' : 'var(--color-border)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                        transition: 'all var(--transition-fast)',
                        boxShadow: input.trim() && !loading ? 'var(--shadow-orange)' : 'none',
                        flexShrink: 0
                    }}
                    title="Send Question"
                >
                    <Send size={16} style={{ transform: 'translateX(1px)' }} />
                </button>
            </div>
        </div>
    );
}
