import { useState, useEffect } from 'react'
import StudentChat from './components/StudentChat'
import TeacherDashboard from './components/TeacherDashboard'
import Login from './components/Login'
import Navbar from './components/Navbar'
import Home from './components/Home'
import About from './components/About'
import Practice from './components/Practice'
import About from './components/About'
import { supabase } from './lib/supabaseClient'

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
        const pendingCount = data.questions ? data.questions.filter(q => q.status === 'pending').length : 0;
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

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '20vh' }}>Loading...</div>
  }

  if (!session) {
    return <Login />
  }

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
          <Practice session={session} refreshPractice={fetchPracticeCount} />
        </div>
      )}
    </div>
  )
}

export default App
