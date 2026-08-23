import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Flame,
  BookOpen,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { ProgressBar } from '../components/common/AvatarStack';
import { CourseCard } from '../components/cards/CourseCard';
import { PromoCard } from '../components/cards/PromoCard';
import {
  MOCK_ANNOUNCEMENTS,
  MOCK_TASKS,
  MOCK_COURSES,
  MOCK_NEXT_LESSONS
} from '../services/mockData';
import { fetchSessions } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function StudentDashboard() {
  const navigate = useNavigate();
  const { session, user, displayName } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const categories = ['All', 'Computer Science', 'Mathematics', 'Physics'];

  useEffect(() => {
    async function loadPastSessions() {
      try {
        const data = await fetchSessions(session?.access_token);
        setSessions(data.sessions || []);
      } catch (err) {
        console.error('Error loading sessions for dashboard:', err);
      } finally {
        setLoadingSessions(false);
      }
    }
    loadPastSessions();
  }, [session?.access_token]);

  const toggleTaskStatus = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus =
            t.status === 'not_started'
              ? 'in_progress'
              : t.status === 'in_progress'
              ? 'done'
              : 'not_started';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const filteredCourses = selectedCategory === 'All'
    ? MOCK_COURSES
    : MOCK_COURSES.filter((c) => c.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  const lastSession = sessions.length > 0 ? sessions[0] : null;

  return (
    <div className="page-container" style={{ paddingBottom: '3.5rem' }}>
      {/* =====================================================================
          ROW 0: GREETING & WORK TRACKER + CONTINUE LEARNING SHORTCUT
          ===================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}
      >
        {/* Continue Learning Banner */}
        <div
          className="card-white"
          style={{
            padding: '1.75rem',
            borderLeft: '5px solid var(--color-orange)',
            backgroundColor: 'var(--color-white)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <Pill color="orange" size="sm">
                Continue Learning
              </Pill>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Last active yesterday</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.4rem' }}>
              {lastSession?.title || 'Binary Search Trees: Invariants & Lookup Complexity'}
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)' }}>
              Pick up right where you left off with your AI Avatar Tutor.
            </p>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <Button
              variant="orange"
              size="md"
              onClick={() => navigate(lastSession ? `/chat?session_id=${lastSession.id}` : '/chat')}
              icon={ArrowRight}
              iconPosition="right"
            >
              Resume Session
            </Button>
          </div>
        </div>

        {/* Work Tracker Stats Card */}
        <div
          className="card-white"
          style={{
            padding: '1.75rem',
            backgroundColor: 'var(--color-white)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Study Progress Tracker
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-orange)', fontWeight: 700, fontSize: '0.85rem' }}>
              <Flame size={18} /> 6-Day Streak!
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-ink)' }}>18/24</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Topics Mastered</div>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-orange)' }}>14.5h</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Studied This Week</div>
            </div>
          </div>

          <ProgressBar current={18} total={24} color="orange" height={8} />
        </div>
      </section>

      {/* =====================================================================
          ROW A & B: "MY COURSES" 3-UP CARDS & CATEGORY FILTER
          ===================================================================== */}
      <section style={{ marginBottom: '3rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            gap: '1rem'
          }}
        >
          <h2 className="text-h2">My Courses</h2>
          <SegmentedControl
            options={categories}
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>

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
              onBookmark={() => alert(`Bookmarked ${course.title}`)}
            />
          ))}
        </div>
      </section>

      {/* =====================================================================
          ROW C: SPLIT PANEL (Next Lessons Table + Promo Card)
          ===================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.75rem',
          marginBottom: '3rem'
        }}
      >
        {/* Left (~65%): "My next lessons" Table */}
        <div
          className="card-white"
          style={{
            padding: '1.75rem',
            gridColumn: 'span 2'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              My Next Lessons
            </h3>
            <button
              type="button"
              onClick={() => navigate('/library')}
              style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-orange)' }}
            >
              View all materials →
            </button>
          </div>

          {/* Lessons Table / List */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {MOCK_NEXT_LESSONS.map((lesson, idx) => (
              <div
                key={lesson.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.1rem 0',
                  borderBottom: idx === MOCK_NEXT_LESSONS.length - 1 ? 'none' : '1px solid var(--color-border)',
                  gap: '1rem'
                }}
              >
                {/* Lesson info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--color-offwhite)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: 'var(--color-ink)'
                    }}
                  >
                    {lesson.lessonNumber}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.3 }}>
                      {lesson.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                      {lesson.courseName}
                    </div>
                  </div>
                </div>

                {/* Teacher Avatar & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <img
                    src={lesson.teacherAvatar}
                    alt={lesson.teacher}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    {lesson.teacher}
                  </span>
                </div>

                {/* Duration & Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {lesson.duration}
                  </span>
                  <Button
                    size="sm"
                    variant="orange"
                    onClick={() => navigate(`/chat?q=Explain%20lesson:%20${encodeURIComponent(lesson.title)}`)}
                  >
                    Start
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (~35%): Promo Card */}
        <PromoCard
          category="Advanced Systems"
          categoryColor="purple"
          eyebrow="Suggested by Curriculum AI"
          title="Virtual Memory Paging & Cache Hierarchies"
          onAction={() => navigate('/chat?q=Explain%20Virtual%20Memory%20Paging')}
        />
      </section>

      {/* =====================================================================
          ROW D: TASKS & ASSIGNMENTS + ANNOUNCEMENTS FEED + RECENT SESSIONS
          ===================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.75rem'
        }}
      >
        {/* Tasks & Assignments */}
        <div className="card-white" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              Tasks & Assignments
            </h3>
            <Pill color="ink" size="sm">{tasks.filter((t) => t.status !== 'done').length} Pending</Pill>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTaskStatus(task.id)}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: task.status === 'done' ? 'var(--color-offwhite)' : 'var(--color-white)',
                  border: '1.5px solid var(--color-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: task.status === 'done' ? 0.6 : 1,
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                    Due {task.dueDate} • {task.course}
                  </div>
                </div>

                <Pill
                  color={task.status === 'done' ? 'green' : task.status === 'in_progress' ? 'orange' : 'ink'}
                  size="sm"
                >
                  {task.status === 'done' ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'To Do'}
                </Pill>
              </div>
            ))}
          </div>
        </div>

        {/* Updates / Announcements Feed */}
        <div className="card-white" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              Updates & Feed
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-orange)', fontWeight: 700 }}>Live Feed</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {MOCK_ANNOUNCEMENTS.map((ann) => (
              <div
                key={ann.id}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-offwhite)',
                  borderLeft: `4px solid ${ann.urgent ? 'var(--color-orange)' : 'var(--color-border)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <Pill color={ann.categoryColor} size="sm">{ann.category}</Pill>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{ann.date}</span>
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.2rem' }}>
                  {ann.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {ann.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tutor Sessions (Reuse /api/sessions) */}
        <div className="card-white" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              Recent Tutor Q&A
            </h3>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-orange)' }}
            >
              + New Chat
            </button>
          </div>

          {loadingSessions ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading sessions...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sessions.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/chat?session_id=${s.id}`)}
                  style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-white)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {s.title || 'Untitled Session'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                      {s.topic || 'Syllabus Topic'}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
