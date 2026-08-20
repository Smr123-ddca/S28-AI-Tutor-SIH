import { useState, useEffect } from 'react'
import StudentChat from './components/StudentChat'
import TeacherDashboard from './components/TeacherDashboard'
import Login from './components/Login'
import Navbar from './components/Navbar'
import Home from './components/Home'
import About from './components/About'
import { supabase } from './lib/supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('home')

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
      />

      {view === 'home' && <Home role={role} setView={setView} />}
      {view === 'about' && <About />}

      {view === 'app' && (
        <div className="app-container" style={{ paddingTop: '2rem' }}>
          {role === 'student' && <StudentChat session={session} />}
          {role === 'teacher' && <TeacherDashboard session={session} />}
          {!role && <div>Error: Role not found for this user.</div>}
        </div>
      )}
    </div>
  )
}

export default App
