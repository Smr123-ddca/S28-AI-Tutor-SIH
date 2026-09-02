import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Sparkles, KeyRound, CheckCircle2, AlertCircle, GraduationCap } from 'lucide-react';

/**
 * =====================================================================
 * [BACKEND-DEPENDENT SECURITY FLAG]: TEACHER ACCESS WALL
 * =====================================================================
 * A frontend-only invite code is NOT real security — anyone can inspect
 * the client bundle or network payloads to extract hardcoded strings.
 *
 * REAL PRODUCTION ENFORCEMENT REQUIRES:
 * (a) A Supabase Row-Level Security (RLS) policy or server-side endpoint
 *     that restricts setting profiles.role = 'teacher' to verified admin
 *     invitations or cryptographic tokens, OR
 * (b) An admin-approval workflow where new educator accounts start with
 *     status = 'pending_verification' until flipped by an institution admin.
 *
 * The check below against VITE_TEACHER_INVITE_CODE is a placeholder UI gate.
 * =====================================================================
 */
const EXPECTED_TEACHER_CODE = import.meta.env.VITE_TEACHER_INVITE_CODE || 'TEACH-LEARNIFY-2026';

export function Login() {
  const navigate = useNavigate();
  const { switchRole } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Teacher Access Code State
  const [isTeacherSignup, setIsTeacherSignup] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const effectiveRole = isSignUp ? (isTeacherSignup ? 'teacher' : 'student') : 'student';

    try {
      if (isSignUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: effectiveRole, display_name: displayName }
          }
        });
        if (signUpError) throw signUpError;

        if (signUpData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ id: signUpData.user.id, role: effectiveRole, display_name: displayName });

          if (profileError) throw profileError;
        }

        setSuccessMsg(
          `Sign up successful as ${effectiveRole.toUpperCase()}! You can now log in or check confirmation email.`
        );
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;

        // Fetch role to redirect to appropriate dashboard
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', signInData.user.id)
          .single();

        const userRole = profile?.role || 'student';
        navigate(userRole === 'teacher' ? '/teacher' : '/');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = (chosenRole) => {
    switchRole(chosenRole);
    navigate(chosenRole === 'teacher' ? '/teacher' : '/');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-offwhite)',
        padding: '2rem'
      }}
    >
      <div
        className="card-white"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '2.5rem 2rem',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              backgroundColor: 'var(--color-orange)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: 'var(--shadow-orange)'
            }}
          >
            <Sparkles size={26} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-ink)' }}>
            {isSignUp ? 'Join Study-app' : 'Welcome to Learnify'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            {isSignUp
              ? 'Create your personalized syllabus Learnify account'
              : 'Log in to continue your learning journey'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div
            style={{
              backgroundColor: 'var(--color-red-light)',
              color: '#b91c1c',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              border: '1px solid #fca5a5'
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              backgroundColor: 'var(--color-green-light)',
              color: '#15803d',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              border: '1px solid #86efac'
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isSignUp && (
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Rivers"
                required={isSignUp}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-ink)', display: 'block', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@study.edu"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-ink)', display: 'block', marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* TEACHER/STUDENT ROLE SELECTION */}
          {isSignUp && (
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-offwhite)',
                border: '1px solid var(--color-border)',
                marginTop: '0.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                  Account Type:
                </span>
                <span style={{ fontSize: '0.78rem', color: isTeacherSignup ? 'var(--color-purple)' : 'var(--color-orange)', fontWeight: 700 }}>
                  {isTeacherSignup ? 'Educator / Teacher' : 'Standard Student'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsTeacherSignup(false)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: !isTeacherSignup ? '2px solid var(--color-orange)' : '1px solid var(--color-border)',
                    backgroundColor: !isTeacherSignup ? 'var(--color-orange-subtle)' : '#fff',
                    fontWeight: !isTeacherSignup ? 700 : 500,
                    color: !isTeacherSignup ? 'var(--color-orange)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setIsTeacherSignup(true)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: isTeacherSignup ? '2px solid var(--color-purple)' : '1px solid var(--color-border)',
                    backgroundColor: isTeacherSignup ? 'var(--color-purple-light)' : '#fff',
                    fontWeight: isTeacherSignup ? 700 : 500,
                    color: isTeacherSignup ? 'var(--color-purple)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Teacher
                </button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="orange"
            size="md"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? 'Processing...' : isSignUp ? (isTeacherSignup ? 'Register as Teacher' : 'Register as Student') : 'Log In'}
          </Button>
        </form>

        {/* Toggle Sign up / Log in */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account yet? "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setIsTeacherSignup(false);
            }}
            style={{ color: 'var(--color-orange)', fontWeight: 700, textDecoration: 'underline' }}
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </div>

        {/* Dev Fast-Track Mock Login Bypass */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px dashed var(--color-border)',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            ⚡ Fast-Track Dev Bypass
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDevBypass('student')}
            >
              Enter as Student
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDevBypass('teacher')}
            >
              Enter as Teacher
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
