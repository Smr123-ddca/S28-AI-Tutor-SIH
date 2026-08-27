import { useState } from 'react';

export default function Navbar({ setView, currentView, handleLogout, displayName, role, practiceCount }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);

    return (
        <nav className="site-nav">
            <div className="nav-left" onClick={() => setView('home')} style={{ cursor: 'pointer' }}>
                <span className="lf-logo">
                    Learnify<span className="lf-logospan">Tutor</span>
                </span>
            </div>

            <div className="nav-center">
                <button
                    className={`nav-link-btn ${currentView === 'home' ? 'active' : ''}`}
                    onClick={() => setView('home')}
                >
                    Home
                </button>
                <button
                    className={`nav-link-btn ${currentView === 'about' ? 'active' : ''}`}
                    onClick={() => setView('about')}
                >
                    About
                </button>
                {role === 'student' && practiceCount > 0 && (
                    <button
                        className={`nav-link-btn ${currentView === 'practice' ? 'active' : ''}`}
                        onClick={() => setView('practice')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        Practice <span style={{ background: '#3b82f6', color: 'white', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '12px' }}>{practiceCount}</span>
                    </button>
                )}
                {role === 'teacher' && (
                    <button
                        className={`nav-link-btn ${currentView === 'courses' ? 'active' : ''}`}
                        onClick={() => setView('courses')}
                    >
                        Manage Courses
                    </button>
                )}
            </div>

            <div className="nav-right">
                <div className="avatar-container" onClick={() => setDropdownOpen(!dropdownOpen)}>
                    <div className="nav-avatar">
                        {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                    </div>

                    {dropdownOpen && (
                        <div className="nav-dropdown">
                            <div className="dropdown-header">
                                <span className="dropdown-name">{displayName || 'User'}</span>
                                <span className="dropdown-role">{role === 'teacher' ? 'Teacher' : 'Student'}</span>
                            </div>
                            <button className="dropdown-logout" onClick={handleLogout}>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
