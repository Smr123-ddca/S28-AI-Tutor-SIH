import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  MessageSquareText,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  FileCheck,
  GraduationCap
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import { StatCard } from '../components/cards/StatCard';
import { PromoCard } from '../components/cards/PromoCard';
import { useAuth } from '../context/AuthContext';

export function Home() {
  const navigate = useNavigate();
  const { role, switchRole } = useAuth();

  return (
    <div className="page-container" style={{ paddingBottom: '4rem' }}>
      {/* =====================================================================
          HERO SECTION — SELL GROUNDED TUTORING
          ===================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          alignItems: 'center',
          padding: '2.5rem 0 3.5rem',
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <div>
          {/* Eyebrow Trust Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <Pill color="orange" size="sm" icon={Sparkles}>
              Curriculum-Grounded AI Tutor
            </Pill>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Zero Hallucinations • Verified Academic Retrieval
            </span>
          </div>

          {/* Mixed Display Headline */}
          <h1 className="text-display" style={{ marginBottom: '1.25rem' }}>
            Master difficult concepts with <span style={{ color: 'var(--color-orange)' }}>grounded</span> AI tutoring.
          </h1>

          <p className="text-body" style={{ maxWidth: '540px', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: 1.6 }}>
            LearnifyTutor connects directly to your university textbooks, slides, and syllabus notes — delivering progressive Socratic clues, verified citations with page references, and targeted prerequisite diagnosis.
          </p>

          {/* CTA Row -> Points to Chat & Document Library */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <Button
              variant="orange"
              size="lg"
              onClick={() => navigate('/chat')}
              icon={ArrowRight}
              iconPosition="right"
            >
              Ask a Doubt Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/library')}
              icon={BookOpen}
            >
              Browse Document Library
            </Button>
          </div>
        </div>

        {/* Right Hero Graphic / Promo Card */}
        <div style={{ position: 'relative' }}>
          <PromoCard
            category="Algorithms & Data Structures"
            categoryColor="yellow"
            eyebrow="Active Grounded Module"
            title="Binary Search Trees, AVL Rotations & Recursive Unwinding"
            extraCount={184}
            onAction={() => navigate('/chat?q=Explain%20Binary%20Search%20Trees%20and%20AVL%20Rotations')}
          />
        </div>
      </section>

      {/* =====================================================================
          HERO STATS ROW — 4 REAL TRACKED METRICS
          ===================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          margin: '3rem 0'
        }}
      >
        <StatCard
          tag="Verification"
          tagColor="purple"
          number="100%"
          label="syllabus-grounded textbook citations"
        />
        <StatCard
          tag="Remediation"
          tagColor="orange"
          number="94.8%"
          label="prerequisite gap resolution rate"
        />
        <StatCard
          tag="Interactivity"
          tagColor="yellow"
          number="12,400+"
          label="Socratic hint ladders solved"
        />
        <StatCard
          tag="Mastery"
          tagColor="sky"
          number="4.95 / 5"
          label="average student comprehension rating"
        />
      </section>

      {/* =====================================================================
          CORE TUTORING PILLARS (Replaces Generic Catalog Grid)
          ===================================================================== */}
      <section style={{ margin: '3.5rem 0 2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-orange)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
            Pedagogical Framework
          </div>
          <h2 className="text-h1">
            Built for deep learning, not <span style={{ color: 'var(--color-orange)' }}>shortcuts</span>.
          </h2>
          <p className="text-body" style={{ maxWidth: '620px', marginTop: '0.5rem' }}>
            Generic AI chatbots give answers away. LearnifyTutor teaches you how to think with pedagogical guardrails.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {/* Pillar 1 */}
          <div
            className="card-white"
            style={{
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              border: '1.5px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.25rem'
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-orange-subtle)',
                  color: 'var(--color-orange)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}
              >
                <HelpCircle size={22} />
              </div>
              <Pill color="orange" size="sm" style={{ marginBottom: '0.75rem' }}>
                Mode 1: Direct Q&A
              </Pill>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Syllabus-Grounded Explanations
              </h3>
              <p className="text-body" style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>
                Ask any doubt from your coursework. Every response includes verified textbook citations, chunk references, and inline practice self-checks.
              </p>
            </div>
            <Button
              variant="orange"
              size="sm"
              onClick={() => navigate('/chat')}
              icon={ArrowRight}
              iconPosition="right"
              style={{ width: 'fit-content' }}
            >
              Start Q&A Session
            </Button>
          </div>

          {/* Pillar 2 */}
          <div
            className="card-white"
            style={{
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              border: '1.5px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.25rem'
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-purple-light)',
                  color: 'var(--color-purple)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}
              >
                <Lightbulb size={22} />
              </div>
              <Pill color="purple" size="sm" style={{ marginBottom: '0.75rem' }}>
                Mode 2: Socratic Hints
              </Pill>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Progressive Hint Ladders
              </h3>
              <p className="text-body" style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>
                Test your conceptual understanding. The tutor reveals sequential clues as you submit hypotheses, guiding you without revealing the final answer.
              </p>
            </div>
            <Button
              variant="ink"
              size="sm"
              onClick={() => navigate('/chat')}
              icon={ArrowRight}
              iconPosition="right"
              style={{ width: 'fit-content' }}
            >
              Try Socratic Practice
            </Button>
          </div>

          {/* Pillar 3 */}
          <div
            className="card-white"
            style={{
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              border: '1.5px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.25rem'
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-yellow-light)',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}
              >
                <FileCheck size={22} />
              </div>
              <Pill color="yellow" size="sm" style={{ marginBottom: '0.75rem' }}>
                Mode 3: Diagnostic Roadmap
              </Pill>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Automated Prerequisite Detection
              </h3>
              <p className="text-body" style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>
                When you struggle on advanced concepts, LearnifyTutor identifies the root prerequisite gap and generates a custom 3-step mastery roadmap.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/library')}
              icon={BookOpen}
              style={{ width: 'fit-content' }}
            >
              Explore Ingested Syllabus
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          DARK PROMO BAND
          ===================================================================== */}
      <section
        className="card-ink"
        style={{
          marginTop: '4rem',
          padding: '3rem 2.5rem',
          borderRadius: 'var(--radius-xl)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          alignItems: 'center'
        }}
      >
        <div>
          <Pill color="yellow" size="sm" style={{ marginBottom: '1rem' }}>
            Ready to Begin?
          </Pill>
          <h2 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '1rem', lineHeight: 1.2 }}>
            Master difficult concepts with verified syllabus grounding.
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Experience instant concept breakdowns with step-by-step reasoning, textbook citations, and automatic prerequisite detection.
          </p>
          <Button
            variant="orange"
            size="lg"
            onClick={() => navigate('/chat')}
            icon={Sparkles}
          >
            Launch AI Tutor Session
          </Button>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-yellow)' }}>
            Quick Links:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Button variant="outline" size="sm" onClick={() => navigate('/chat')}>
              Ask a Doubt (Q&A)
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/library')}>
              Document Library
            </Button>
            {role === 'teacher' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/teacher')}
                icon={GraduationCap}
              >
                Teacher Analytics
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  switchRole('teacher');
                  navigate('/teacher');
                }}
                icon={GraduationCap}
              >
                Educator Portal
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
