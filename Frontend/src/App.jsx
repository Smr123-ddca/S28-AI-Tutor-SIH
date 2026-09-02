import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { RequireRole } from './components/auth/RequireRole';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { ChatPage } from './pages/ChatPage';
import { LibraryPage } from './pages/LibraryPage';
import { TeacherHome } from './pages/TeacherHome';
import { TeacherPrerequisites } from './pages/TeacherPrerequisites';
import { TeacherMisconceptions } from './pages/TeacherMisconceptions';
import { TeacherAnalytics } from './pages/TeacherAnalytics';

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
        <div style={{ fontWeight: 600, fontSize: '1rem' }}>Loading Study-app BODH...</div>
      </div>
    );
  }

  // If not logged in and not in mock mode, redirect to /login
  if (!session && !isMockAuth) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

import { TeacherHomeLanding } from './pages/TeacherHomeLanding';

function RoleBasedHome() {
  const { role } = useAuth();
  return role === 'teacher' ? <TeacherHomeLanding /> : <Home />;
}

export function App() {
  return (
    <Routes>
      {/* Standalone Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated App Routes with Shell & Strict Role Guards */}
      <Route element={<ProtectedLayout />}>
        {/* Dynamic Entry Base */}
        <Route path="/" element={<RoleBasedHome />} />

        {/* Student-Only Routes (Task 3: Redirects Teacher to /teacher) */}
        <Route element={<RequireRole role="student" />}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/library" element={<LibraryPage />} />
        </Route>

        {/* Teacher-Only Routes */}
        <Route element={<RequireRole role="teacher" />}>
          <Route path="/teacher" element={<TeacherHome />} />
          <Route path="/teacher/review" element={<TeacherPrerequisites />} />
          <Route path="/teacher/dashboard" element={<TeacherMisconceptions />} />
          <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
