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

<<<<<<< HEAD
// Shell layout wrapper with session check
function ProtectedLayout() {
  const { session, loading, isMockAuth } = useAuth();
=======
function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('home')
  const [practiceCount, setPracticeCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserRole(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchUserRole(session.user.id)
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching role:', error)
      } else {
        setRole(data?.role)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPracticeCount = async () => {
    if (role !== 'student' || !session) return;
    try {
      const res = await fetch('/api/practice-questions', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const pendingCount = data.questions ? data.questions.filter(q => q.status === 'pending' && !q.answer_revealed).length : 0;
        setPracticeCount(pendingCount);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (role === 'student' && session) {
      fetchPracticeCount();
    }
  }, [role, session])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setView('home')
  }
>>>>>>> 8e4cde74d8e84d274a58d8f7de47c0af090761e2

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

<<<<<<< HEAD
  return <AppShell />;
=======
  const displayName = session.user?.user_metadata?.display_name || session.user?.email || 'User';

  return (
    <div className="app-wrapper">
      <Navbar
        setView={setView}
        currentView={view}
        handleLogout={handleLogout}
        displayName={displayName}
        role={role}
        practiceCount={practiceCount}
      />

      {view === 'home' && <Home role={role} setView={setView} />}
      {view === 'about' && <About />}

      {view === 'app' && (
        <div className="app-container" style={{ paddingTop: '2rem' }}>
          {role === 'student' && <StudentChat session={session} refreshPractice={fetchPracticeCount} />}
          {role === 'teacher' && <TeacherDashboard session={session} />}
          {!role && <div>Error: Role not found for this user.</div>}
        </div>
      )}

      {view === 'practice' && role === 'student' && (
        <div className="app-container" style={{ paddingTop: '2rem' }}>
          <Practice session={session} refreshPractice={fetchPracticeCount} setView={setView} />
        </div>
      )}
    </div>
  )
>>>>>>> 8e4cde74d8e84d274a58d8f7de47c0af090761e2
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
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
