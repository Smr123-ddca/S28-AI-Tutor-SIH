import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home, MessageSquareText, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';

/**
 * 404 Page: Route Not Found
 * Displayed for any unmatched routes or broken deep links.
 */
export function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
        backgroundColor: 'var(--color-offwhite)'
      }}
    >
      <div
        className="card-white"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '3rem 2.25rem',
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '22px',
            backgroundColor: 'var(--color-orange-subtle)',
            color: 'var(--color-orange)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-orange)'
          }}
        >
          <Compass size={36} />
        </div>

        <div style={{ marginBottom: '0.65rem' }}>
          <Pill color="orange" size="sm">
            404 • Page Not Found
          </Pill>
        </div>

        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 700,
            color: 'var(--color-ink)',
            marginBottom: '0.65rem',
            lineHeight: 1.2
          }}
        >
          Off the Syllabus Map
        </h1>

        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            marginBottom: '2rem',
            maxWidth: '460px',
            margin: '0 auto 2rem'
          }}
        >
          The page or curriculum module you are looking for does not exist or has been moved. Let&apos;s get you back to your learning materials.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.85rem',
            justifyContent: 'center'
          }}
        >
          <Button
            variant="orange"
            size="md"
            onClick={() => navigate('/chat')}
            icon={MessageSquareText}
          >
            Go to AI Tutor Chat
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/library')}
            icon={BookOpen}
          >
            Browse Library
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate(-1)}
            icon={ArrowLeft}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
