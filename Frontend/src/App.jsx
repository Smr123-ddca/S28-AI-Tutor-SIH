import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { RequireRole } from './components/auth/RequireRole';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { ChatPage } from './pages/ChatPage';
import { LibraryPage } from './pages/LibraryPage';
import { TeacherDashboard } from './pages/TeacherDashboard';

// Shell layout wrapper with session check
function ProtectedLayout() {
  const { session, loading, isMockAuth } = useAuth();

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
        <div style={{ fontWeight: 600, fontSize: '1rem' }}>Loading LearnifyTutor...</div>
      </div>
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

        {/* Student-Only Routes (Redirects Teacher to /teacher) */}
        <Route element={<RequireRole role="student" />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/library" element={<LibraryPage />} />
          {/* Legacy /dashboard redirects to /chat */}
          <Route path="/dashboard" element={<Navigate to="/chat" replace />} />
        </Route>

        {/* Teacher-Only Routes (Redirects Student to /chat) */}
        <Route element={<RequireRole role="teacher" />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
