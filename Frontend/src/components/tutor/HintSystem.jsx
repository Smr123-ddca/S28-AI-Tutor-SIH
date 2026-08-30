import React, { useState } from 'react';
import { Lightbulb, CheckCircle2, Sparkles, HelpCircle, Eye, ChevronRight } from 'lucide-react';
import { MOCK_PRACTICE_QUESTIONS_FLOW } from '../../services/mockData';
import { Button } from '../common/Button';
import { Pill } from '../common/Pill';
import { useSoundManager } from '../../services/soundManager';

export function HintSystem({ onComplete, className = '' }) {
  const { playSound } = useSoundManager();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [revealedHints, setRevealedHints] = useState(1); // Start with 1 clue visible or available
  const [showAllClues, setShowAllClues] = useState(false);
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
      // Escalate hints sequentially
      const nextHintCount = Math.min(revealedHints + 1, currentQ.hints.length);
      setRevealedHints(nextHintCount);
      setFeedbackState('hint_escalated');
    }
  };

  const handleRevealNextClue = () => {
    playSound('click');
    setRevealedHints((prev) => Math.min(prev + 1, currentQ.hints.length));
  };

  const handleApplyHypothesis = (sampleHypothesis) => {
    playSound('click');
    setStudentAnswer(sampleHypothesis);
  };

  const handleNextQuestion = () => {
    playSound('click');
    if (currentIdx < MOCK_PRACTICE_QUESTIONS_FLOW.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setStudentAnswer('');
      setRevealedHints(1);
      setShowAllClues(false);
      setFeedbackState('attempting');
    } else {
      if (onComplete) onComplete();
    }
  };

  const visibleCount = showAllClues ? currentQ.hints.length : revealedHints;

  return (
    <div
      className={`card-white ${className}`}
      style={{
        padding: '2rem',
        borderRadius: 'var(--radius-xl)',
        border: '1.5px solid var(--color-border)',
        backgroundColor: 'var(--color-white)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Notice Banner explaining the Socratic mode */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1.2rem',
          backgroundColor: 'var(--color-yellow-light)',
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid #fce79f',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: '#854d0e'
        }}
      >
        <Lightbulb size={18} style={{ flexShrink: 0, color: 'var(--color-orange)' }} />
        <span>
          <strong>Interactive Socratic Practice:</strong> The tutor guides your reasoning with escalating clues instead of giving away answers. Formulate and test your hypothesis below.
        </span>
      </div>

      {/* Progress & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Pill color="purple" size="md">
            Question {currentIdx + 1} of {MOCK_PRACTICE_QUESTIONS_FLOW.length}
          </Pill>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Topic: {currentQ.topic || 'Data Structures'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Clues unlocked: {Math.min(visibleCount, currentQ.hints.length)} of {currentQ.hints.length}
          </span>
          <button
            type="button"
            onClick={() => setShowAllClues(!showAllClues)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)'
            }}
          >
            <Eye size={12} /> {showAllClues ? 'Sequential View' : 'Reveal All'}
          </button>
        </div>
      </div>

      {/* Question Prompt */}
      <div
        style={{
          padding: '1.25rem',
          backgroundColor: 'var(--color-offwhite)',
          borderRadius: 'var(--radius-lg)',
          borderLeft: '4px solid var(--color-orange)',
          marginBottom: '1.75rem'
        }}
      >
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-orange)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
          Socratic Challenge
        </div>
        <h3
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--color-ink)',
            lineHeight: 1.4
          }}
        >
          {currentQ.question}
        </h3>
      </div>

      {/* Sequential Clue Cards Ladder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Progressive Hint Ladder:
        </div>

        {currentQ.hints.slice(0, visibleCount).map((hint, hIdx) => (
          <div
            key={hIdx}
            style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-orange-subtle)',
              border: '1.5px solid var(--color-border)',
              borderLeft: '5px solid var(--color-orange)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              animation: 'float-subtle 0.25s ease'
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-orange)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {hIdx + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--color-orange)',
                  textTransform: 'uppercase',
                  marginBottom: '0.2rem'
                }}
              >
                Clue {hIdx + 1}:
              </div>
              <div style={{ fontSize: '0.92rem', color: 'var(--color-ink)', lineHeight: 1.5 }}>
                {hint}
              </div>
            </div>
          </div>
        ))}

        {/* Locked Clue Placeholders */}
        {!showAllClues && revealedHints < currentQ.hints.length && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px dashed var(--color-border)',
              backgroundColor: 'var(--color-offwhite)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              🔒 Clue {revealedHints + 1} is locked (attempts escalate clues automatically).
            </span>
            <button
              type="button"
              onClick={handleRevealNextClue}
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--color-orange)',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              💡 Reveal Next Clue Now
            </button>
          </div>
        )}
      </div>

      {/* Suggested Hypothesis Starter Chips */}
      {feedbackState !== 'correct' && currentQ.sampleHypotheses && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
            Suggested hypothesis starters:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {currentQ.sampleHypotheses.map((hyp, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => handleApplyHypothesis(hyp)}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-offwhite)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-ink)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                💭 "{hyp.length > 50 ? `${hyp.slice(0, 48)}...` : hyp}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feedback State & Input */}
      {feedbackState === 'correct' ? (
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--color-green-light)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-green)',
            marginBottom: '1rem',
            animation: 'float-subtle 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-green)', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
            <CheckCircle2 size={22} /> Excellent Reasoning!
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--color-text-primary)', lineHeight: 1.55 }}>
            {currentQ.conceptRecap}
          </p>
          <div style={{ marginTop: '1.25rem' }}>
            <Button variant="orange" size="md" onClick={handleNextQuestion} icon={ChevronRight} iconPosition="right">
              {currentIdx < MOCK_PRACTICE_QUESTIONS_FLOW.length - 1 ? 'Next Question' : 'Complete Socratic Practice Session'}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCheckAnswer}>
          {feedbackState === 'hint_escalated' && (
            <div
              style={{
                fontSize: '0.82rem',
                color: 'var(--color-orange)',
                fontWeight: 600,
                marginBottom: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Sparkles size={14} /> Close attempt! Check the newly unlocked clue above and refine your answer.
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Type your hypothesis or answer..."
              style={{
                flex: 1,
                minWidth: '240px',
                padding: '0.85rem 1.4rem',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--color-border)',
                outline: 'none',
                fontSize: '0.95rem',
                backgroundColor: 'var(--color-offwhite)',
                transition: 'border-color var(--transition-fast)'
              }}
            />
            <Button type="submit" variant="orange" size="md" disabled={!studentAnswer.trim()}>
              Submit Hypothesis
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
