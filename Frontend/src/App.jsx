import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { RequireRole } from './components/auth/RequireRole';
import { LoadingState } from './components/common/LoadingState';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { ChatPage } from './pages/ChatPage';
import { LibraryPage } from './pages/LibraryPage';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { NotFound } from './pages/NotFound';
import { Forbidden } from './pages/Forbidden';

// Shell layout wrapper with session check
function ProtectedLayout() {
  const { session, loading, isMockAuth } = useAuth();

  if (loading) {
    return (
      <LoadingState
        variant="fullscreen"
        message="Loading LearnifyTutor..."
        description="Initializing your curriculum grounding session..."
      />
    );
  }

  // If not logged in and not in mock mode, redirect to /login
  if (!session && !isMockAuth) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

export function App() {
  return (
    <Routes>
      {/* Standalone Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated App Routes with Shell & Strict Role Guards */}
      <Route element={<ProtectedLayout />}>
        {/* Home is accessible by both authenticated roles */}
        <Route path="/" element={<Home />} />

        {/* Student-Only Routes (Protected by RequireRole) */}
        <Route element={<RequireRole role="student" />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/library" element={<LibraryPage />} />
          {/* Legacy /dashboard redirects to /chat */}
          <Route path="/dashboard" element={<Navigate to="/chat" replace />} />
        </Route>

        {/* Teacher-Only Routes (Protected by RequireRole) */}
        <Route element={<RequireRole role="teacher" />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
        </Route>

        {/* Dedicated 403 Forbidden State View */}
        <Route path="/forbidden" element={<Forbidden />} />

        {/* 404 Route within authenticated shell */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
