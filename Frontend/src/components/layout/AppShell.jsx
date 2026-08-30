import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { IconRail } from './IconRail';
import { TopNav } from './TopNav';
import { useAuth } from '../../context/AuthContext';
import { Sparkles } from 'lucide-react';

import { OfflineBanner } from '../common/OfflineBanner';

export function AppShell({ children }) {
  const navigate = useNavigate();
  const { role, switchRole, isMockAuth } = useAuth();

  const handleDevRoleToggle = () => {
    const nextRole = role === 'student' ? 'teacher' : 'student';
    switchRole(nextRole);
    navigate(nextRole === 'teacher' ? '/teacher' : '/dashboard');
  };

  return (
    <div className="app-viewport">
      {/* 72px Left Dark Icon Rail */}
      <IconRail />

      {/* Main Content Area */}
      <div className="content-viewport">
        <OfflineBanner />
        <TopNav />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {children || <Outlet />}
        </main>
      </div>

      {/* Dev Mode Switcher Pill */}
      {isMockAuth && (
        <aside
          aria-label="Development Mode Controls"
          className="dev-mock-pill"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-yellow)' }}>
            <Sparkles size={14} />
            <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>DEV BYPASS</span>
          </div>
          <span style={{ opacity: 0.4 }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>Role:</span>
            <button
              type="button"
              onClick={handleDevRoleToggle}
              style={{
                background: role === 'teacher' ? 'var(--color-purple)' : 'var(--color-orange)',
                color: role === 'teacher' ? 'var(--color-ink)' : '#ffffff',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                fontSize: '0.72rem'
              }}
            >
              {role?.toUpperCase()} ⟳
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
