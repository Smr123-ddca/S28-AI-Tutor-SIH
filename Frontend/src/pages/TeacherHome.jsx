import React, { useState, useEffect } from 'react';
import { GraduationCap, UploadCloud, BookOpen, Trash2, Eye, Edit3, Settings, FileText, X } from 'lucide-react';
import { Pill } from '../components/common/Pill';
import { fetchLibraryDocuments, deleteCourse, uploadCourseDoc } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { useNavigate } from 'react-router-dom';

export function TeacherHome() {
    const { session, displayName } = useAuth();
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Upload state
    const [showUpload, setShowUpload] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const docsData = await fetchLibraryDocuments(session?.access_token);
            setDocuments(docsData.documents || []);
        } catch (err) {
            console.error('Error loading teacher home data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [session?.access_token]);

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!uploadFile) {
            alert('Please select a file to upload.');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('files', uploadFile);

            const res = await uploadCourseDoc(formData, session?.access_token);
            setUploadSuccess(true);
            setUploadFile(null);

            // Auto-redirect to Review page
            setTimeout(() => {
                const courseName = res.course || res.courseName || uploadFile.name.split('.')[0];
                navigate(`/teacher/review?course=${encodeURIComponent(courseName)}`);
            }, 1000);
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (courseName) => {
        if (!window.confirm(`Are you sure you want to permanently delete course "${courseName}"? All artifacts will be removed. This cannot be undone.`)) {
            return;
        }

        try {
            await deleteCourse(courseName, session?.access_token);
            await loadData();
        } catch (err) {
            alert('Failed to delete course: ' + err.message);
        }
    };

    const StatusPill = ({ status }) => {
        if (status === 'published') return <Pill color="green" size="sm">Published & RAG Active</Pill>;
        if (status === 'approved') return <Pill color="purple" size="sm">Approved (Ready to Publish)</Pill>;
        if (status === 'needs_revision') return <Pill color="red" size="sm">Needs Revision</Pill>;
        return <Pill color="orange" size="sm">Pending Review</Pill>;
    };

    // Grouping
    const published = documents.filter(d => d.status === 'published');
    const approved = documents.filter(d => d.status === 'approved');
    const pending = documents.filter(d => d.status === 'pending_review' || d.status === 'needs_revision');

    const renderCourseCard = (doc, idx, showReviewAction = false) => (
        <div key={idx} style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <b style={{ fontSize: '1.2rem', color: 'var(--color-ink)' }}>{doc.subject}</b>
                        <StatusPill status={doc.status} />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', gap: '1rem' }}>
                        <span>Reference: {doc.id}</span>
                        <span>•</span>
                        <span>Chunks: {doc.totalChunks}</span>
                        <span>•</span>
                        <span>Uploaded: {doc.uploadDate}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {doc.status === 'published' && (
                        <button onClick={() => navigate(`/teacher/review?course=${encodeURIComponent(doc.id)}`)} className="btn btn-outline" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Settings size={14} /> Manage
                        </button>
                    )}
                    {(doc.status === 'pending_review' || doc.status === 'needs_revision' || doc.status === 'approved') && (
                        <button onClick={() => navigate(`/teacher/review?course=${encodeURIComponent(doc.id)}`)} className="btn btn-purple" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Edit3 size={14} /> Review & Approve
                        </button>
                    )}
                    <button onClick={() => handleDelete(doc.id)} className="btn btn-outline" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#dc2626', borderColor: '#dc2626' }}>
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );

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
                        <button onClick={() => setShowUpload(!showUpload)} className="btn btn-orange" style={{ padding: '0.8rem 1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {showUpload ? <X size={18} /> : <UploadCloud size={18} />}
                            {showUpload ? 'Cancel Upload' : 'Upload New Subject'}
                        </button>
                    </div>
                </div>
            </section>

            {showUpload && (
                <section style={{ marginBottom: '2.5rem' }}>
                    <div className="card-white" style={{ padding: '2rem', border: '2px solid var(--color-purple)' }}>
                        <h2 className="text-h2" style={{ marginBottom: '0.5rem', color: 'var(--color-purple)' }}>New Subject Ingestion</h2>
                        <p className="text-body" style={{ marginBottom: '1.5rem', maxWidth: '600px' }}>
                            Upload PDF materials. They will be automatically processed by the backend (chunked, vectorized, and formulated into a prerequisite graph).
                        </p>

                        {uploadSuccess ? (
                            <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-green-subtle)', border: '1.5px dashed var(--color-green)', borderRadius: 'var(--radius-md)' }}>
                                <h4 style={{ color: '#166534', fontWeight: 700, marginBottom: '0.5rem' }}>Successfully Ingested!</h4>
                                <p style={{ fontSize: '0.85rem', color: '#15803d' }}>
                                    Redirecting to the course review dashboard...
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleUploadSubmit} style={{ display: 'grid', gap: '1.5rem', maxWidth: '600px' }}>
                                <div>
                                    <label
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '3rem 2rem',
                                            border: '1.5px dashed var(--color-purple)',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: 'var(--color-purple-light)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <input
                                            type="file"
                                            accept=".pdf,.txt,.pptx"
                                            onChange={(e) => setUploadFile(e.target.files[0])}
                                            style={{ display: 'none' }}
                                        />
                                        <UploadCloud size={32} style={{ color: 'var(--color-purple)', marginBottom: '0.75rem' }} />
                                        {uploadFile ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-ink)', fontWeight: 600 }}>
                                                <FileText size={16} /> {uploadFile.name}
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-ink)' }}>Click to browse or drag file here</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                                                    Supports PDF, TXT, PPTX (Max 50MB)
                                                </div>
                                            </>
                                        )}
                                    </label>
                                </div>

                                <div>
                                    <Button variant="purple" size="lg" type="submit" style={{ width: '100%' }} disabled={isUploading || !uploadFile}>
                                        {isUploading ? 'Native Pipeline Executing...' : 'Extract Chunks & Map Graph'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </section>
            )}

            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                <div className="card-white" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ingested Sources</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-orange)' }}>{loading ? '--' : documents.length} Files</div>
                    </div>
                    <BookOpen size={24} style={{ color: 'var(--color-orange)' }} />
                </div>
            </section>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Course Library</h3>

            {loading ? (<p style={{ color: 'var(--color-text-muted)', margin: '1rem 0' }}>Syncing syllabus materials...</p>) : documents.length === 0 ? (
                <div className="card-white" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-text-secondary)' }}>You have no ingested sources active for RAG limits. Upload documents to provision courses.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Pending Section */}
                    {pending.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-orange)', marginBottom: '0.75rem' }}>Pending Review</h4>
                            {pending.map(doc => renderCourseCard(doc, doc.id, true))}
                        </div>
                    )}

                    {/* Approved Section */}
                    {approved.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-purple)', marginBottom: '0.75rem' }}>Approved (Ready to Publish)</h4>
                            {approved.map(doc => renderCourseCard(doc, doc.id, true))}
                        </div>
                    )}

                    {/* Published Section */}
                    {published.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#15803d', marginBottom: '0.75rem' }}>Published & Active</h4>
                            {published.map(doc => renderCourseCard(doc, doc.id, false))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
