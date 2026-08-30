import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSoundManager } from '../../services/soundManager';
import { Pill } from '../common/Pill';

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
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {role === 'teacher' ? 'Your teaching workspace in' : 'Welcome back to'}
        </div>
        <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.2 }}>
          Learn<span style={{ color: 'var(--color-orange)' }}>ify</span>
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
              placeholder="Search lessons or topics..."
              className="search-pill-input"
            />
            <button type="submit" className="search-pill-btn" aria-label="Search">
              <Search size={16} />
            </button>
          </div>
        </form>

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

        {/* Profile Card */}
        <div style={{ position: 'relative' }}>
          <div
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
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', paddingRight: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.1 }}>
                {displayName}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {user?.handle || (role === 'teacher' ? '@teacher_prof' : '@student_learner')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
