import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingState } from '../common/LoadingState';
import { Forbidden } from '../../pages/Forbidden';

/**
 * =====================================================================
 * Strict Role-Based Access Control Guard (RequireRole)
 * =====================================================================
 * Rules:
 *  1. Unauthenticated users -> Redirect to /login
 *  2. Role mismatch (e.g. student hitting /teacher) -> Render 403 Forbidden
 *  3. Authorized role -> Render children or <Outlet />
 * =====================================================================
 */
export function RequireRole({ role: requiredRole, children }) {
  const { session, role: currentRole, loading, isMockAuth } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <LoadingState
        variant="fullscreen"
        message="Verifying Academic Credentials..."
        description="Authenticating role permissions and curriculum access..."
      />
    );
  }

  // 1. Unauthenticated check
  if (!session && !isMockAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role mismatch -> Render 403 Forbidden state
  if (requiredRole && currentRole !== requiredRole) {
    return <Forbidden />;
  }

  return children || <Outlet />;
}
