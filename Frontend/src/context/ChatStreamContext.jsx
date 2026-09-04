import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  explainQuestion,
  fetchSessions,
  fetchSessionMessages,
  updateSessionTitle,
  deleteSession as apiDeleteSession,
  fetchLibraryDocuments
} from '../services/api';
import { useAuth } from './AuthContext';
import { useSoundManager } from '../services/soundManager';

const ChatStreamContext = createContext(null);

export function ChatStreamProvider({ children }) {
  const { session, user } = useAuth();
  const token = session?.access_token;
  const { playSound } = useSoundManager();

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  // messagesBySession: { [sessionId: string]: Array<Message> }
  // '__draft__' key holds draft messages before session_id is provisioned
  const [messagesBySession, setMessagesBySession] = useState({});

  // generatingSessions: { [sessionId: string]: { isGenerating: boolean, question: string, startTime: number } }
  const [generatingSessions, setGeneratingSessions] = useState({});

  const [subjects, setSubjects] = useState([]);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [currentTopic, setCurrentTopic] = useState('Welcome to Learnify');
  const [tutorState, setTutorState] = useState('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [studentId, setStudentId] = useState('');

  // Initial studentId initialization
  useEffect(() => {
    let sid = localStorage.getItem('ai_tutor_student_id');
    if (!sid) {
      sid = user?.id || crypto.randomUUID();
      localStorage.setItem('ai_tutor_student_id', sid);
    }
    setStudentId(sid);
  }, [user]);

  // Load published subjects on mount
  useEffect(() => {
    async function loadSubjects() {
      try {
        const docsData = await fetchLibraryDocuments(token);
        const publishedDocs = (docsData.documents || []).filter((d) => d.status === 'published');
        const availableSubjects = publishedDocs.map((d) => d.subject);
        const uniqueSubjects = [...new Set(availableSubjects)].filter(Boolean);
        setSubjects(uniqueSubjects);
        if (uniqueSubjects.length > 0 && !currentSubject) {
          setCurrentSubject(uniqueSubjects[0]);
        }
      } catch (err) {
        // Handled silently during auth handshake
      }
    }
    if (token) {
      loadSubjects();
    }
  }, [token]);

  // Load session list on mount or token change
  const refreshSessions = useCallback(async () => {
    if (!token) return [];
    try {
      const data = await fetchSessions(token);
      setSessions(data.sessions || []);
      return data.sessions || [];
    } catch (err) {
      return [];
    }
  }, [token]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Fetch messages for a specific session ID
  const loadSessionMessages = useCallback(async (sid) => {
    if (!sid) return [];
    try {
      const data = await fetchSessionMessages(sid, token);
      const formatted = (data.messages || []).map((m) => {
        if (m.role === 'user') return { role: 'user', text: m.content };
        return { role: 'bot', ...(m.response_json || { status: 'answered', message: m.content }) };
      });

      setMessagesBySession((prev) => {
        // Keep any in-flight unconfirmed user messages if generation is in progress
        const existing = prev[sid] || [];
        const isGen = generatingSessions[sid]?.isGenerating;
        if (isGen && existing.length > formatted.length) {
          return prev;
        }
        return { ...prev, [sid]: formatted };
      });
      return formatted;
    } catch (err) {
      console.error('Error fetching session messages for', sid, err);
      return [];
    }
  }, [token, generatingSessions]);

  // Select a session
  const selectSession = useCallback(async (sid) => {
    playSound('click');
    setCurrentSessionId(sid);

    const selected = sessions.find((s) => s.id === sid);
    if (selected && selected.course) {
      setCurrentSubject(selected.course);
    }

    // If messages not loaded in memory yet, load them
    if (!messagesBySession[sid]) {
      setTutorState('thinking');
      await loadSessionMessages(sid);
      setTutorState('idle');
    }
  }, [sessions, messagesBySession, loadSessionMessages, playSound]);

  // Start new draft chat
  const newChat = useCallback(() => {
    playSound('click');
    setCurrentSessionId(null);
    setTutorState('idle');
    setIsSpeaking(false);
  }, [playSound]);

  // Send message - Fully decoupled from component lifecycle
  const sendMessage = useCallback(async ({ question, customSubject, originalVagueQuestion = null }) => {
    const textToSend = question?.trim();
    if (!textToSend) return;

    const targetSubject = customSubject || currentSubject;
    const activeSid = currentSessionId;
    const sessionKey = activeSid || '__draft__';

    // Prevent duplicate sending on the same active session if already generating
    if (generatingSessions[sessionKey]?.isGenerating) {
      return;
    }

    playSound('messageSent');
    const userMsg = { role: 'user', text: textToSend };

    // 1. Instantly append user message to the session's buffer
    setMessagesBySession((prev) => ({
      ...prev,
      [sessionKey]: [...(prev[sessionKey] || []), userMsg]
    }));

    // 2. Mark this session as generating in global state
    setGeneratingSessions((prev) => ({
      ...prev,
      [sessionKey]: { isGenerating: true, question: textToSend, startTime: Date.now() }
    }));

    setTutorState('thinking');

    // 3. Dispatch backend request (runs in background even if user navigates away or switches tabs)
    (async () => {
      try {
        const payload = {
          question: textToSend,
          student_id: studentId,
          session_id: activeSid,
          token,
          subject: targetSubject
        };

        if (originalVagueQuestion) {
          payload.clarification_context = { original_question: originalVagueQuestion };
        }

        const data = await explainQuestion(payload);

        // Sound & Speech trigger
        playSound('responseReady');
        setTutorState('speaking');
        setIsSpeaking(true);

        if (data.results && data.results.length > 0 && data.results[0].topic) {
          setCurrentTopic(data.results[0].topic);
        }

        const botMsg = { role: 'bot', ...data };
        const resolvedSessionId = data.session_id || activeSid;

        setMessagesBySession((prev) => {
          const currentMsgs = prev[sessionKey] || [];
          const updated = [...currentMsgs, botMsg];

          if (sessionKey === '__draft__' && resolvedSessionId) {
            // Migrate draft buffer to new session ID
            const nextMap = { ...prev };
            delete nextMap['__draft__'];
            nextMap[resolvedSessionId] = updated;
            return nextMap;
          }

          return { ...prev, [sessionKey]: updated };
        });

        // If a new session was created and user is currently viewing the draft, switch to the new session ID
        if (!activeSid && resolvedSessionId) {
          setCurrentSessionId(resolvedSessionId);
        }

        // Refresh sidebar sessions list
        await refreshSessions();

        // Simulate tutor vocalization window
        setTimeout(() => {
          setIsSpeaking(false);
          setTutorState('idle');
        }, 4000);
      } catch (err) {
        console.error('Chat generation error in background:', err);
        const errorMsg = {
          role: 'bot',
          status: 'error',
          message: err.message || 'Could not connect to Learnify backend. Please check your connection.'
        };

        setMessagesBySession((prev) => ({
          ...prev,
          [sessionKey]: [...(prev[sessionKey] || []), errorMsg]
        }));
        setTutorState('idle');
        setIsSpeaking(false);
      } finally {
        // Clear generation state for this session key
        setGeneratingSessions((prev) => {
          const next = { ...prev };
          delete next[sessionKey];
          return next;
        });
      }
    })();
  }, [
    currentSessionId,
    currentSubject,
    generatingSessions,
    playSound,
    studentId,
    token,
    refreshSessions
  ]);

  // Rename session
  const renameSession = useCallback(async (sid, oldTitle) => {
    const newTitle = prompt('Enter new session title:', oldTitle);
    if (!newTitle || newTitle === oldTitle) return;
    await updateSessionTitle(sid, newTitle, token);
    await refreshSessions();
  }, [token, refreshSessions]);

  // Delete session
  const deleteSession = useCallback(async (sid) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await apiDeleteSession(sid, token);
        if (currentSessionId === sid) {
          newChat();
        }
        setMessagesBySession((prev) => {
          const next = { ...prev };
          delete next[sid];
          return next;
        });
        await refreshSessions();
      } catch (err) {
        console.error('Error deleting session:', err);
      }
    }
  }, [token, currentSessionId, newChat, refreshSessions]);

  // Active messages getter for current view
  const activeSessionKey = currentSessionId || '__draft__';
  const activeMessages = messagesBySession[activeSessionKey] || [];
  const isCurrentGenerating = !!generatingSessions[activeSessionKey]?.isGenerating;

  const value = {
    sessions,
    currentSessionId,
    currentSubject,
    setCurrentSubject,
    currentTopic,
    subjects,
    tutorState,
    isSpeaking,
    studentId,
    activeMessages,
    isCurrentGenerating,
    generatingSessions,
    messagesBySession,
    selectSession,
    newChat,
    sendMessage,
    renameSession,
    deleteSession,
    refreshSessions,
    loadSessionMessages
  };

  return (
    <ChatStreamContext.Provider value={value}>
      {children}
    </ChatStreamContext.Provider>
  );
}

export function useChatStream() {
  const context = useContext(ChatStreamContext);
  if (!context) {
    throw new Error('useChatStream must be used within a ChatStreamProvider');
  }
  return context;
}
