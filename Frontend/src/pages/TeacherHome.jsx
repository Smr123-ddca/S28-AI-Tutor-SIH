import React, { useState, useEffect } from 'react';
import { GraduationCap, UploadCloud, BookOpen } from 'lucide-react';
import { Pill } from '../components/common/Pill';
import { fetchLibraryDocuments } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function TeacherHome() {
    const { session, displayName } = useAuth();
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const docsData = await fetchLibraryDocuments(session?.access_token);
                setDocuments(docsData.documents || []);
            } catch (err) {
                console.error('Error loading teacher home data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [session?.access_token]);

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            <section style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                            <Pill color="purple" size="sm" icon={GraduationCap}>Educator Hub</Pill>
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                                Logged in as {displayName}
                            </span>
                        </div>
                        <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
                            Teacher <span style={{ color: 'var(--color-orange)' }}>Home</span>
                        </h1>
                        <p className="text-body" style={{ maxWidth: '680px' }}>
                            Welcome to the Learnify Tutor Teacher Workspace. View your active authorized syllabus sources and access uploading pipelines, prerequisite trees, or class diagnostics via the navigation panel.
                        </p>
                    </div>
                    <div>
                        <button onClick={() => navigate('/teacher/upload')} className="btn btn-orange" style={{ padding: '0.8rem 1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <UploadCloud size={18} /> Upload New Syllabus
                        </button>
                    </div>
                </div>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                <div className="card-white" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ingested Sources</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-orange)' }}>{loading ? '--' : documents.length} Files</div>
                    </div>
                    <BookOpen size={24} style={{ color: 'var(--color-orange)' }} />
                </div>
            </section>

            <section className="card-white" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Active Learnify Course Materials</h3>
                {loading ? (<p style={{ color: 'var(--color-text-muted)' }}>Syncing syllabus materials...</p>) : documents.length === 0 ? (
                    <p style={{ color: 'var(--color-text-secondary)' }}>You have no ingested sources active for RAG limits. Upload documents to provision courses.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {documents.map((doc, idx) => (
                            <div key={idx} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <b style={{ fontSize: '1.1rem' }}>{doc.subject}</b>
                                    <Pill color="green" size="sm">Published & RAG Active</Pill>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ID/File Reference: {doc.id}</div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
