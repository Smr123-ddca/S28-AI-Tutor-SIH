import { useState, useEffect } from 'react'
import StudentChat from './components/StudentChat'
import TeacherDashboard from './components/TeacherDashboard'
import Login from './components/Login'
import { supabase } from './lib/supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

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
  }

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '20vh' }}>Loading...</div>
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="app-container">
      <div className="nav-bar" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="nav-btn active"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        {role === 'student' && <StudentChat session={session} />}
        {role === 'teacher' && <TeacherDashboard session={session} />}
        {!role && <div>Error: Role not found for this user.</div>}
      </div>
    </div>
  )
}

export default App
