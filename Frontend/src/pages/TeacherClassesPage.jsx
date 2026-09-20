import React, { useState, useEffect } from 'react';
import { TeacherClasses } from '../components/classes/TeacherClasses';
import { fetchLibraryDocuments } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users } from 'lucide-react';
import { Pill } from '../components/common/Pill';

export function TeacherClassesPage() {
    const { session, displayName } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const docsData = await fetchLibraryDocuments(session?.access_token);
                setDocuments(docsData.documents || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [session?.access_token]);

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            <section style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                    <Pill color="teal" size="sm" icon={Users}>Classroom Management</Pill>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        Logged in as {displayName}
                    </span>
                </div>
                <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
                    Teacher <span style={{ color: 'var(--color-teal)' }}>Classes</span>
                </h1>
                <p className="text-body" style={{ maxWidth: '680px' }}>
                    Manage your active classroom rosters, create new sections, and distribute join codes to students.
                </p>
            </section>

            {loading ? (
                <p style={{ color: 'var(--color-text-muted)' }}>Loading interface...</p>
            ) : (
                <TeacherClasses availableCourses={documents} />
            )}
        </div>
    );
}

export default TeacherClassesPage;
