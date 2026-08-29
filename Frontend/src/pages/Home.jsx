import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { StatCard } from '../components/cards/StatCard';
import { CourseCard } from '../components/cards/CourseCard';
import { PromoCard } from '../components/cards/PromoCard';
import { MOCK_COURSES } from '../services/mockData';
import { useAuth } from '../context/AuthContext';

export function Home() {
  const navigate = useNavigate();
  const { switchRole } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Computer Science', 'Mathematics', 'Physics'];

  const filteredCourses = selectedCategory === 'All'
    ? MOCK_COURSES
    : MOCK_COURSES.filter((c) => c.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  return (
    <div className="page-container" style={{ paddingBottom: '4rem' }}>
      {/* =====================================================================
          HERO SECTION
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
              AI-Powered Syllabus Tutor
            </Pill>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Zero Hallucinations • Curriculum Grounded
            </span>
          </div>

          {/* Mixed Display Headline */}
          <h1 className="text-display" style={{ marginBottom: '1.25rem' }}>
            Find the right <span style={{ color: 'var(--color-orange)' }}>course</span> for you & master difficult concepts.
          </h1>

          <p className="text-body" style={{ maxWidth: '520px', marginBottom: '2rem', fontSize: '1.05rem' }}>
            BODH bridges knowledge gaps with live Socratic hints, automated prerequisite detection, and verified textbook citations.
          </p>

          {/* CTA Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <Button
              variant="orange"
              size="lg"
              onClick={() => navigate('/dashboard')}
              icon={ArrowRight}
              iconPosition="right"
            >
              Open Student Dashboard
            </Button>
            <Button
              variant="ink"
              size="lg"
              onClick={() => navigate('/chat')}
              icon={Sparkles}
            >
              Ask AI Avatar Tutor
            </Button>
          </div>
        </div>

        {/* Right Hero Graphic / Promo Card */}
        <div style={{ position: 'relative' }}>
          <PromoCard
            category="Algorithms & AI"
            categoryColor="yellow"
            eyebrow="Curriculum Spotlight"
            title="Binary Search Trees, Rotations & Graph Traversals"
            extraCount={184}
            onAction={() => navigate('/chat?q=Explain%20Binary%20Search%20Trees')}
          />
        </div>
      </section>

      {/* =====================================================================
          HERO STATS ROW
          ===================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          margin: '3rem 0'
        }}
      >
        <StatCard tag="Curriculum" tagColor="purple" number="+40" label="approved syllabus subjects" />
        <StatCard tag="AI Tutor" tagColor="orange" number="100%" label="grounded textbook citations" />
        <StatCard tag="Student Reviews" tagColor="yellow" number="★ 4.95" label="average tutor satisfaction" />
        <StatCard tag="Remediation" tagColor="sky" number="92%" label="prerequisite gap resolution" />
      </section>

      {/* =====================================================================
          COURSE CATALOG CAROUSEL SECTION
          ===================================================================== */}
      <section style={{ margin: '4rem 0 2rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '2rem',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-orange)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Explore Modules
            </div>
            <h2 className="text-h1">
              Take your <span style={{ color: 'var(--color-orange)' }}>knowledge</span> a degree further.
            </h2>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SegmentedControl
              options={categories}
              value={selectedCategory}
              onChange={setSelectedCategory}
            />
          </div>
        </div>

        {/* 3-Up / 4-Up Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              category={course.category}
              title={course.title}
              progressCurrent={course.progressCurrent}
              progressTotal={course.progressTotal}
              participantAvatars={course.participantAvatars}
              participantExtraCount={course.participantExtraCount}
              onContinue={() => navigate(`/chat?course=${encodeURIComponent(course.title)}`)}
              onBookmark={() => alert(`Saved ${course.title} to bookmarks!`)}
            />
          ))}
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
            Ready to Accelerate?
          </Pill>
          <h2 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '1rem', lineHeight: 1.2 }}>
            Never get stuck on homework or exam concepts again.
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Experience instant concept breakdowns with animated avatar explanations, practice checks, and auto-detected learning gaps.
          </p>
          <Button
            variant="orange"
            size="lg"
            onClick={() => navigate('/chat')}
            icon={Sparkles}
          >
            Launch Tutor Session
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
            Quick Navigation Links:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Student Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/library')}>
              Document Library
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                switchRole('teacher');
                navigate('/teacher');
              }}
            >
              Teacher Analytics
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
