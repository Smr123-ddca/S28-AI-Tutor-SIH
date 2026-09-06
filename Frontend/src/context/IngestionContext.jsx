import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const IngestionContext = createContext({
    activeJobs: [],
    clearCompletedJobs: () => { }
});

export const useIngestion = () => useContext(IngestionContext);

export const IngestionProvider = ({ children }) => {
    const { session, role } = useAuth();
    const [activeJobs, setActiveJobs] = useState([]);

    // Fetch ingestion status for teachers
    useEffect(() => {
        if (role !== 'teacher' || !session?.access_token) {
            return;
        }

        let isMounted = true;
        let pollInterval;

        const fetchStatus = async () => {
            try {
                const response = await fetch('/api/ingest/status', {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });

                if (response.ok && isMounted) {
                    const data = await response.json();
                    setActiveJobs(data);
                }
            } catch (err) {
                // Quietly fail, ambient polling
            }
        };

        // Initial fetch
        fetchStatus();

        // Poll every 4 seconds only if there are active processing jobs
        // Actually, always poll so we can catch new jobs that were started in other tabs/windows
        pollInterval = setInterval(fetchStatus, 4000);

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
        };
    }, [session?.access_token, role]);

    const clearCompletedJobs = () => {
        // In a real system, you might want to call the backend to clear it from memory,
        // but for this UI, we can just hide completed ones locally.
        // Actually backend retains them. Let's just track a "hidden" list locally.
    };

    return (
        <IngestionContext.Provider value={{ activeJobs, clearCompletedJobs }}>
            {children}
        </IngestionContext.Provider>
    );
};
