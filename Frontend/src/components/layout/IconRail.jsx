import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquareText,
  BookOpen,
  GraduationCap,
  Home,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * =====================================================================
 * TASK 4: Nav Consistency by Role
 * =====================================================================
 * The navigation rail only renders links that the active role has access to.
 *  - Student: Home (/), Dashboard (/dashboard), AI Tutor Chat (/chat), Library (/library)
 *  - Teacher: Home (/), Teacher Analytics (/teacher)
 * This prevents dead links and matches RequireRole guards precisely.
 * =====================================================================
 */
export function IconRail() {
  const { role, logout, switchRole, isMockAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRoleToggle = () => {
    const nextRole = role === 'student' ? 'teacher' : 'student';
    switchRole(nextRole);
    navigate(nextRole === 'teacher' ? '/teacher' : '/dashboard');
  };

  // Filter navigation items strictly by active role
  const allNavItems = [
    {
      to: '/',
      icon: Home,
      title: 'Home',
      roles: ['student', 'teacher']
    },
    {
      to: '/chat',
      icon: MessageSquareText,
      title: 'Learnify Tutor Chat',
      roles: ['student']
    },
    {
      to: '/library',
      icon: BookOpen,
      title: 'Document Library',
      roles: ['student']
    },
    {
      to: '/teacher/upload',
      icon: Sparkles,
      title: 'Upload Syllabus Material',
      roles: ['teacher']
    },
    {
      to: '/teacher/prerequisites',
      icon: LayoutDashboard,
      title: 'Prerequisite Charts',
      roles: ['teacher']
    },
    {
      to: '/teacher/misconceptions',
      icon: GraduationCap,
      title: 'Student Misconceptions',
      roles: ['teacher']
    }
  ];

  const visibleNavItems = allNavItems.filter((item) =>
    item.roles.includes(role || 'student')
  );

  return (
    <aside
      className="icon-rail"
      style={{
        width: '74px',
        height: '100%',
        backgroundColor: 'var(--color-ink)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 0.5rem',
        zIndex: 50,
        flexShrink: 0,
        justifyContent: 'space-between'
      }}
    >
      {/* Top Brand Mark */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <NavLink
          to="/"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            backgroundColor: 'var(--color-orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: 'var(--shadow-orange)'
          }}
          title="BODH | Study-app"
        >
          <Sparkles size={22} />
        </NavLink>

        {/* Role-Filtered Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.title}
                style={({ isActive }) => ({
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive ? 'var(--color-orange)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  transition: 'all var(--transition-fast)',
                  boxShadow: isActive ? 'var(--shadow-orange)' : 'none'
                })}
              >
                <Icon size={21} />
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions: Role Quick-Toggle + Logout */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        {isMockAuth && (
          <button
            type="button"
            onClick={handleRoleToggle}
            title={`Active: ${role?.toUpperCase()} Mode (Click to switch)`}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: role === 'teacher' ? 'var(--color-purple)' : 'rgba(255, 255, 255, 0.12)',
              color: role === 'teacher' ? 'var(--color-ink)' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.75rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            {role === 'teacher' ? 'T' : 'S'}
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          title="Log Out"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.5)',
            transition: 'color var(--transition-fast)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff5734')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)')}
        >
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}
