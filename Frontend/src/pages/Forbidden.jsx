import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, GraduationCap, MessageSquareText, RefreshCw } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import { useAuth } from '../context/AuthContext';

/**
 * 403 Page: Forbidden / Permission Denied
 * Displayed when user lacks role credentials to access a protected area.
 */
export function Forbidden() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, switchRole, isMockAuth } = useAuth();

  const targetArea = location.state?.from || 'Restricted Area';
  const requiredRole = location.state?.requiredRole || (role === 'student' ? 'teacher' : 'student');

  const handleRoleSwitch = () => {
    switchRole(requiredRole);
    navigate(requiredRole === 'teacher' ? '/teacher' : '/chat');
  };

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
          boxShadow: 'var(--shadow-md)',
          border: '1.5px solid var(--color-border)'
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '22px',
            backgroundColor: 'var(--color-red-light)',
            color: 'var(--color-red)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <ShieldAlert size={36} />
        </div>

        <div style={{ marginBottom: '0.65rem' }}>
          <Pill color="orange" size="sm">
            403 • Access Restricted
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
          Educator Credentials Required
        </h1>

        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            marginBottom: '1.5rem',
            maxWidth: '460px',
            margin: '0 auto 1.5rem'
          }}
        >
          You are currently logged in as a <strong>{role || 'Student'}</strong>. This section ({targetArea}) is restricted to verified <strong>{requiredRole}</strong> accounts.
        </p>

        {isMockAuth && (
          <div
            style={{
              padding: '0.9rem 1.2rem',
              backgroundColor: 'var(--color-purple-light)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.75rem',
              fontSize: '0.84rem',
              color: 'var(--color-ink)',
              textAlign: 'left'
            }}
          >
            <strong>💡 Quick Role Switcher (Mock Mode Active):</strong>
            <p style={{ marginTop: '0.25rem', color: 'var(--color-text-secondary)' }}>
              You can instantly switch to <strong>{requiredRole.toUpperCase()}</strong> role below to test this route:
            </p>
            <Button
              variant="orange"
              size="sm"
              onClick={handleRoleSwitch}
              icon={RefreshCw}
              style={{ marginTop: '0.65rem' }}
            >
              Switch to {requiredRole.toUpperCase()} Role
            </Button>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.85rem',
            justifyContent: 'center'
          }}
        >
          <Button
            variant="ink"
            size="md"
            onClick={() => navigate(role === 'teacher' ? '/teacher' : '/chat')}
            icon={role === 'teacher' ? GraduationCap : MessageSquareText}
          >
            Go to My {role === 'teacher' ? 'Teacher Dashboard' : 'Student Tutor'}
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/')}
          >
            Return to Home
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
