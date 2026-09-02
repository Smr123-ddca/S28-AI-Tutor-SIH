import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Award, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { StatCard } from '../components/cards/StatCard';
import { CourseCard } from '../components/cards/CourseCard';
import { PromoIllustration } from '../components/layout/PromoIllustration';
import { fetchLibraryDocuments } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function Home() {
  const navigate = useNavigate();
  const { switchRole, session } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [realCourses, setRealCourses] = useState([]);

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await fetchLibraryDocuments(session?.access_token);
        setRealCourses(data.documents || []);
      } catch (err) {
        console.error('Error fetching courses:', err);
      }
    }
    loadCourses();
  }, [session?.access_token]);

  const categories = ['All', ...new Set(realCourses.map(c => c.subject).filter(Boolean))];

  const filteredCourses = selectedCategory === 'All'
    ? realCourses
    : realCourses.filter((c) => (c.subject || '').toLowerCase().includes(selectedCategory.toLowerCase()));

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
              Learnify Tutor for Students
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
            Learnify bridges knowledge gaps with live Socratic hints, automated prerequisite detection, and verified textbook citations.
          </p>

          {/* CTA Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <Button
              variant="orange"
              size="lg"
              onClick={() => navigate('/chat')}
              icon={ArrowRight}
              iconPosition="right"
            >
              Open Learnify Chat
            </Button>
            <Button
              variant="ink"
              size="lg"
              onClick={() => navigate('/dashboard')}
              icon={Award}
            >
              My Grades & Coursework
            </Button>
          </div>
        </div>

        {/* Right Hero Graphic / Promo Card */}
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PromoIllustration />
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
        <StatCard tag="Learnify Tutor" tagColor="orange" number="100%" label="grounded textbook citations" />
        <StatCard tag="Knowledge Base" tagColor="yellow" number={realCourses.length > 0 ? `${realCourses.length}` : "Loading"} label="active learning modules" />
        <StatCard tag="Availability" tagColor="purple" number="24/7" label="instant conceptual help" />
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
              category={course.subject || 'Curriculum Module'}
              title={course.id || course.filename}
              progressCurrent={0}
              progressTotal={course.totalChunks || course.chapters || 10}
              participantAvatars={[]}
              participantExtraCount={0}
              onContinue={() => navigate(`/chat?subject=${encodeURIComponent(course.id)}`)}
              onBookmark={() => navigate('/library')}
            />
          ))}
        </div>
      </section>

    </div>
  );
}
