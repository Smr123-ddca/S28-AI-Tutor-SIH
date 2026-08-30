import React, { useState, useEffect } from 'react';
import { Lightbulb, CheckCircle2, Loader } from 'lucide-react';
import { Button } from '../common/Button';
import { Pill } from '../common/Pill';
import { useSoundManager } from '../../services/soundManager';
import { useAuth } from '../../context/AuthContext';
import { getPracticeQuestions, submitSocraticAttempt, requestPracticeHint, submitPracticeAttempt } from '../../services/api';

export function HintSystem({ onComplete, className = '', sessionId }) {
  const { session } = useAuth();
  const { playSound } = useSoundManager();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackState, setFeedbackState] = useState('attempting'); // 'attempting' | 'hint_escalated' | 'correct'
  const [tutorMessage, setTutorMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getPracticeQuestions(sessionId, session?.access_token);
        const pending = (data.questions || []).filter(q => q.status === 'pending');
        setQuestions(pending);
      } catch (err) {
        console.error('Failed to fetch practice questions', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, session?.access_token]);

  const currentQ = questions[currentIdx];
  const totalHints = currentQ ? [currentQ.hint_1, currentQ.hint_2].filter(Boolean) : [];
  const revealedHintsCount = currentQ ? Math.min(currentQ.hints_requested || 0, totalHints.length) : 0;

  const handleCheckAnswer = async (e) => {
    e.preventDefault();
    if (!studentAnswer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setTutorMessage('');

    try {
      if (currentQ.hints_requested >= 2 && feedbackState === 'hint_escalated') {
        // Use Socratic Attempt if standard hints are exhausted
        const res = await submitSocraticAttempt(currentQ.id, studentAnswer, session?.access_token);
        if (res.evaluation === 'correct') {
          playSound('correct');
          setFeedbackState('correct');
          setTutorMessage(res.message || 'Excellent reasoning!');
        } else {
          playSound('incorrect');
          setFeedbackState('hint_escalated');
          setTutorMessage(res.message);
          setStudentAnswer('');
        }
      } else {
        // Standard check answer
        const res = await submitPracticeAttempt(currentQ.id, studentAnswer, session?.access_token);

        if (res.evaluation === 'correct') {
          playSound('correct');
          setFeedbackState('correct');
          setTutorMessage(res.message || 'Excellent reasoning! You got it right.');
        } else {
          playSound('incorrect');
          setFeedbackState('hint_escalated');
          setTutorMessage('Your answer was ' + res.evaluation + '. Try again or ask for a clue!');
          setStudentAnswer('');
        }
      }
    } catch (e) {
      console.error('Failed to submit answer:', e);
      setTutorMessage(e.message || 'Error evaluating answer. Please try again.');
      setFeedbackState('hint_escalated');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestHint = async () => {
    try {
      const res = await requestPracticeHint(currentQ.id, session?.access_token);
      const updatedQ = { ...currentQ, hints_requested: res.hints_requested };
      setQuestions(prev => prev.map((q, i) => i === currentIdx ? updatedQ : q));
    } catch (err) {
      console.error('Failed to request hint', err);
    }
  };

  const handleNextQuestion = () => {
    playSound('click');
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setStudentAnswer('');
      setFeedbackState('attempting');
      setTutorMessage('');
    } else {
      if (onComplete) onComplete();
    }
  };

  if (loading) {
    return (
      <div className={`card-white ${className}`} style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)', border: '1.5px solid var(--color-border)', backgroundColor: 'var(--color-white)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <Loader className="animate-spin" size={24} style={{ margin: '0 auto 1rem' }} />
        <p>Loading practice questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={`card-white ${className}`} style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)', border: '1.5px solid var(--color-border)', backgroundColor: 'var(--color-white)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p style={{ marginBottom: '1rem' }}>No pending practice questions found for this session.</p>
        <Button variant="orange" size="md" onClick={() => onComplete && onComplete()}>Return to Chat</Button>
      </div>
    );
  }

  return (
    <div
      className={`card-white ${className}`}
      style={{
        padding: '1.75rem',
        borderRadius: 'var(--radius-xl)',
        border: '1.5px solid var(--color-border)',
        backgroundColor: 'var(--color-white)'
      }}
    >
      {/* Notice Banner explaining the backend capability */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.65rem 1rem',
          backgroundColor: 'var(--color-yellow-light)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #fce79f',
          marginBottom: '1.25rem',
          fontSize: '0.8rem',
          color: '#854d0e'
        }}
      >
        <Lightbulb size={16} style={{ flexShrink: 0 }} />
        <span>
          <strong>Interactive Socratic Practice Mode:</strong> The tutor guides your reasoning with escalating clues instead of handing out answers.
        </span>
      </div>

      {/* Progress & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Pill color="purple" size="sm">
          Question {currentIdx + 1} of {questions.length}
        </Pill>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          Hints available: {totalHints.length - revealedHintsCount}/{totalHints.length}
        </span>
      </div>

      {/* Question Prompt */}
      <h3
        style={{
          fontSize: '1.15rem',
          fontWeight: 700,
          color: 'var(--color-ink)',
          lineHeight: 1.35,
          marginBottom: '1.5rem'
        }}
      >
        {currentQ.question}
      </h3>

      {/* Concept Badge */}
      {currentQ.concept && (
        <div style={{ marginBottom: '1.5rem', marginTop: '-0.75rem' }}>
          <Pill color="sky" size="xs">Concept: {currentQ.concept}</Pill>
        </div>
      )}

      {/* Progressive Hints Ladder */}
      {revealedHintsCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
          {totalHints.slice(0, revealedHintsCount).map((hint, hIdx) => (
            <div
              key={hIdx}
              style={{
                padding: '0.85rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-orange-subtle)',
                borderLeft: '4px solid var(--color-orange)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                animation: 'float-subtle 0.3s ease'
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--color-orange)',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap'
                }}
              >
                Clue {hIdx + 1}:
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--color-ink)', lineHeight: 1.45 }}>
                {hint}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tutor Socratic Guidance Node */}
      {feedbackState === 'hint_escalated' && tutorMessage && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: 'var(--color-purple-light)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #e9d5ff',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <div style={{ fontWeight: 700, color: 'var(--color-purple)', fontSize: '0.85rem', flexShrink: 0 }}>
            Tutor says:
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-ink)', lineHeight: 1.5 }}>
            {tutorMessage}
          </div>
        </div>
      )}

      {/* Feedback State & Input */}
      {feedbackState === 'correct' ? (
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--color-green-light)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid #86efac',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem' }}>
            <CheckCircle2 size={20} /> Excellent Reasoning!
          </div>
          <p style={{ fontSize: '0.9rem', color: '#166534', lineHeight: 1.5 }}>
            {tutorMessage || 'You correctly answered the question using the course materials.'}
          </p>
          <div style={{ marginTop: '1rem' }}>
            <Button variant="orange" size="md" onClick={handleNextQuestion}>
              {currentIdx < questions.length - 1 ? 'Next Question' : 'Complete Practice Flow'}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCheckAnswer}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder={feedbackState === 'hint_escalated' ? "Try again based on the feedback..." : "Type your hypothesis or answer..."}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--color-border)',
                outline: 'none',
                fontSize: '0.92rem',
                backgroundColor: 'var(--color-offwhite)'
              }}
            />
            <Button type="submit" variant="orange" size="md" disabled={isSubmitting || !studentAnswer.trim()}>
              {isSubmitting ? 'Evaluating...' : 'Check Answer'}
            </Button>
          </div>
          {revealedHintsCount < totalHints.length && (
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleRequestHint}
                disabled={isSubmitting}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-orange)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  opacity: isSubmitting ? 0.5 : 1
                }}
              >
                💡 Need a clue without submitting?
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
