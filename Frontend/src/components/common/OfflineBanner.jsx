import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * Hook to detect browser online / offline state
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Accessible OfflineBanner component shown when network connectivity is lost.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          backgroundColor: '#16a34a',
          color: '#ffffff',
          padding: '0.6rem 1.25rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 9999,
          position: 'sticky',
          top: 0,
          transition: 'all var(--transition-normal)'
        }}
      >
        <Wifi size={16} />
        <span>Internet connection restored. Synchronizing session changes...</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        backgroundColor: '#ea580c',
        color: '#ffffff',
        padding: '0.65rem 1.25rem',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        boxShadow: 'var(--shadow-md)',
        zIndex: 9999,
        position: 'sticky',
        top: 0,
        transition: 'all var(--transition-normal)'
      }}
    >
      <WifiOff size={16} />
      <span>
        You are currently offline. Learnify is operating with local cached syllabus knowledge.
      </span>
    </div>
  );
}
