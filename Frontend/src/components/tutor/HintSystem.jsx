import React, { useState } from 'react';
import { Lightbulb, CheckCircle2 } from 'lucide-react';
import { MOCK_PRACTICE_QUESTIONS_FLOW } from '../../services/mockData';
import { Button } from '../common/Button';
import { Pill } from '../common/Pill';
import { useSoundManager } from '../../services/soundManager';

/**
 * =====================================================================
 * [BACKEND-DEPENDENT FEATURE FLAG]: PRACTICE TEST ESCALATING HINTS
 * =====================================================================
 * The current Express backend only returns plain string arrays for
 * `practice_questions` without hint escalation ladders or answer validation.
 *
 * This UI component demonstrates the complete pedagogical interaction:
 *  - Step 1: Student attempts their own response.
 *  - Step 2: On incorrect/partial attempt, the tutor provides Level 1 Hint (Conceptual framing).
 *  - Step 3: On continued struggle, provides Level 2 Hint (Targeted clue).
 *  - Step 4: Step-by-step guidance without giving the direct answer away.
 *
 * PRODUCTION REQUIREMENT:
 * A new backend endpoint (e.g. POST /api/practice-hint) or structured Gemini prompt
 * is required to evaluate student input and dynamically generate progressive clues.
 * =====================================================================
 */
export function HintSystem({ onComplete, className = '' }) {
  const { playSound } = useSoundManager();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [revealedHints, setRevealedHints] = useState(0);
  const [feedbackState, setFeedbackState] = useState('attempting'); // 'attempting' | 'hint_escalated' | 'correct'

  const currentQ = MOCK_PRACTICE_QUESTIONS_FLOW[currentIdx] || MOCK_PRACTICE_QUESTIONS_FLOW[0];

  const handleCheckAnswer = (e) => {
    e.preventDefault();
    if (!studentAnswer.trim()) return;

    const isCorrect = studentAnswer
      .toLowerCase()
      .includes(currentQ.correctAnswerKeyword.toLowerCase());

    if (isCorrect) {
      playSound('correct');
      setFeedbackState('correct');
    } else {
      playSound('incorrect');
      // Escalate hints
      const nextHintCount = Math.min(revealedHints + 1, currentQ.hints.length);
      setRevealedHints(nextHintCount);
      setFeedbackState('hint_escalated');
    }
  };

  const handleNextQuestion = () => {
    playSound('click');
    if (currentIdx < MOCK_PRACTICE_QUESTIONS_FLOW.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setStudentAnswer('');
      setRevealedHints(0);
      setFeedbackState('attempting');
    } else {
      if (onComplete) onComplete();
    }
  };

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
          Question {currentIdx + 1} of {MOCK_PRACTICE_QUESTIONS_FLOW.length}
        </Pill>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          Hints available: {currentQ.hints.length - revealedHints}/{currentQ.hints.length}
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

      {/* Progressive Hints Ladder */}
      {revealedHints > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
          {currentQ.hints.slice(0, revealedHints).map((hint, hIdx) => (
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
            {currentQ.conceptRecap}
          </p>
          <div style={{ marginTop: '1rem' }}>
            <Button variant="orange" size="md" onClick={handleNextQuestion}>
              {currentIdx < MOCK_PRACTICE_QUESTIONS_FLOW.length - 1 ? 'Next Question' : 'Complete Practice Flow'}
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
              placeholder="Type your hypothesis or answer..."
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
            <Button type="submit" variant="orange" size="md">
              Check Answer
            </Button>
          </div>
          {revealedHints < currentQ.hints.length && (
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setRevealedHints((prev) => Math.min(prev + 1, currentQ.hints.length))}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-orange)',
                  textDecoration: 'underline',
                  cursor: 'pointer'
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
