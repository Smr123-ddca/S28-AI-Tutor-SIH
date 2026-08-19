import { useState } from 'react'
import StudentChat from './components/StudentChat'
import TeacherDashboard from './components/TeacherDashboard'
import { supabase } from './lib/supabaseClient'


function App() {
  const [activeView, setActiveView] = useState('chat')

  console.log(supabase);
  return (
    <div className="app-container">
      <div className="nav-bar">
        <button
          className={`nav-btn ${activeView === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveView('chat')}
        >
          Student Chat
        </button>
        <button
          className={`nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          Teacher Dashboard
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        {activeView === 'chat' ? <StudentChat /> : <TeacherDashboard />}
      </div>
    </div>
  )
}

export default App
