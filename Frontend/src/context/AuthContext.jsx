import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MOCK_STUDENT, MOCK_TEACHER } from '../services/mockData';

const AuthContext = createContext(null);

const MOCK_AUTH_ENV = import.meta.env.VITE_MOCK_AUTH === 'true';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(true);
  const [isMockAuth, setIsMockAuth] = useState(MOCK_AUTH_ENV);

  // Initialize Auth
  useEffect(() => {
    // If Supabase keys are missing or VITE_MOCK_AUTH is set, use Mock Auth
    const rawUrl = import.meta.env.VITE_SUPABASE_URL;
    const hasValidSupabase = rawUrl && !rawUrl.includes('placeholder') && !MOCK_AUTH_ENV;

    if (!hasValidSupabase) {
      // Setup Mock Auth
      initMockAuth('student');
      setLoading(false);
      return;
    }

    // Real Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initMockAuth = (targetRole = 'student') => {
    setIsMockAuth(true);
    const mockUser = targetRole === 'teacher' ? MOCK_TEACHER : MOCK_STUDENT;
    setRole(targetRole);
    setUser(mockUser);
    const mockToken = targetRole === 'teacher'
      ? 'mock-teacher-jwt-token-xyz'
      : 'mock-student-jwt-token-xyz';

    setSession({
      access_token: mockToken,
      user: {
        id: mockUser.id,
        email: mockUser.email,
        user_metadata: {
          display_name: mockUser.name,
          avatar_url: mockUser.avatar
        }
      }
    });
  };

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, display_name')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Role fetch warning:', error);
        setRole('student');
      } else {
        setRole(data?.role || 'student');
      }
    } catch (err) {
      console.error(err);
      setRole('student');
    } finally {
      setLoading(false);
    }
  };

  const switchRole = (newRole) => {
    if (isMockAuth) {
      initMockAuth(newRole);
    } else {
      setRole(newRole);
    }
  };

  const toggleMockBypass = (enableMock) => {
    if (enableMock) {
      initMockAuth(role || 'student');
    } else {
      setIsMockAuth(false);
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!isMockAuth) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
  };

  const value = {
    session,
    user,
    role,
    loading,
    isMockAuth,
    switchRole,
    toggleMockBypass,
    logout,
    setRole,
    displayName: user?.name || session?.user?.user_metadata?.display_name || session?.user?.email || 'Learner'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
