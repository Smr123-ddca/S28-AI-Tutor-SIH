import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * =====================================================================
 * TASK 3: Strict Role-Based Access Control Guard (RequireRole)
 * =====================================================================
 * Centralized route guard for student and teacher areas.
 *
 * Rules:
 *  1. Unauthenticated users -> Redirect to /login
 *  2. Student accessing Teacher area (/teacher) -> Redirect to /dashboard
 *  3. Teacher accessing Student area (/dashboard, /chat, /library) -> Redirect to /teacher
 *  4. Authorized role -> Render children or <Outlet />
 * =====================================================================
 */
export function RequireRole({ role: requiredRole, children }) {
  const { session, role: currentRole, loading, isMockAuth } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-offwhite)',
          color: 'var(--color-text-secondary)'
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✨</div>
        <div style={{ fontWeight: 600, fontSize: '1rem' }}>Verifying Academic Credentials...</div>
      </div>
    );
  }

  // 1. Unauthenticated check
  if (!session && !isMockAuth) {
    return <Navigate to="/login" replace />;
  }

  // 2. Role mismatch redirects
  if (requiredRole && currentRole !== requiredRole) {
    if (currentRole === 'student') {
      // Students redirected to their home dashboard
      return <Navigate to="/dashboard" replace />;
    } else if (currentRole === 'teacher') {
      // Teachers redirected to teacher dashboard
      return <Navigate to="/teacher" replace />;
    }
  }

  return children || <Outlet />;
}
