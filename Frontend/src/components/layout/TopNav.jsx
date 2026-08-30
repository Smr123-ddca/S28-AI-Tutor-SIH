import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSoundManager } from '../../services/soundManager';
import { Pill } from '../common/Pill';
import { ThemeToggle } from '../common/ThemeToggle';

export function TopNav() {
  const navigate = useNavigate();
  const { displayName, user, role, switchRole } = useAuth();
  const { isMuted, toggleMute, playSound } = useSoundManager();
  const [searchValue, setSearchValue] = useState('');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      playSound('click');
      navigate(`/chat?q=${encodeURIComponent(searchValue)}`);
    }
  };

  const handleRoleChange = (newRole) => {
    playSound('click');
    switchRole(newRole);
    setShowRoleMenu(false);
    navigate(newRole === 'teacher' ? '/teacher' : '/dashboard');
  };

  const handleSoundToggle = () => {
    const nextMuted = toggleMute();
    if (!nextMuted) {
      playSound('correct');
    }
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-white)',
        gap: '1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}
    >
      {/* Left: Greeting line */}
      <div>
        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          Welcome back to
        </div>
        <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.2 }}>
          Learnify<span style={{ color: 'var(--color-orange)' }}>Tutor</span>
        </div>
      </div>

      {/* Center-Right: Search + Actions + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, justifyContent: 'flex-end' }}>
        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ width: '100%', maxWidth: '380px' }}>
          <div className="search-pill-container">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Ask a doubt or search lessons..."
              className="search-pill-input"
            />
            <button type="submit" className="search-pill-btn" aria-label="Search">
              <Search size={16} />
            </button>
          </div>
        </form>

        {/* Theme Toggle (Dark/Light) */}
        <ThemeToggle />

        {/* UI Sound Mute/Unmute Control */}
        <button
          type="button"
          onClick={handleSoundToggle}
          className="btn-icon btn-outline"
          title={isMuted ? 'Unmute UI Sound Effects' : 'Mute UI Sound Effects'}
          aria-label="Toggle Sound Effects"
        >
          {isMuted ? (
            <VolumeX size={18} style={{ color: 'var(--color-text-muted)' }} />
          ) : (
            <Volume2 size={18} style={{ color: 'var(--color-orange)' }} />
          )}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn-icon btn-outline"
            style={{ position: 'relative' }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-orange)'
              }}
            />
          </button>

          {showNotifications && (
            <div
              className="card-white"
              style={{
                position: 'absolute',
                top: '52px',
                right: 0,
                width: '320px',
                padding: '1.25rem',
                zIndex: 60,
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem' }}>Notifications</h4>
                <Pill color="orange" size="sm">2 New</Pill>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Prerequisite Refresher Ready</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Review BST Invariants before tomorrow's quiz.</div>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Prof. Sharma uploaded new PDF</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Check Algorithms_Core_BST_Notes in Library.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Card & Role Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.35rem 0.65rem 0.35rem 0.35rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-white)',
              transition: 'background var(--transition-fast)'
            }}
          >
            <img
              src={
                user?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
              }
              alt={displayName}
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.1 }}>
                {displayName}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {user?.handle || (role === 'teacher' ? '@teacher_prof' : '@student_learner')}
              </span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--color-text-secondary)' }} />
          </button>

          {showRoleMenu && (
            <div
              className="card-white"
              style={{
                position: 'absolute',
                top: '52px',
                right: 0,
                width: '240px',
                padding: '0.75rem',
                zIndex: 60,
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                ACTIVE ROLE
              </div>
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: role === 'student' ? 'var(--color-orange-subtle)' : 'transparent',
                  color: role === 'student' ? 'var(--color-orange)' : 'var(--color-ink)',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <span>Student Mode</span>
                {role === 'student' && <CheckCircle2 size={16} />}
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('teacher')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: role === 'teacher' ? 'var(--color-purple-light)' : 'transparent',
                  color: role === 'teacher' ? 'var(--color-ink)' : 'var(--color-ink)',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <span>Teacher Mode</span>
                {role === 'teacher' && <CheckCircle2 size={16} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
