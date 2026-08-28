import { useState, useEffect } from 'react';
import TeacherReview from './TeacherReview';

export default function CourseManager({ session }) {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [view, setView] = useState('list'); // 'list', 'upload', 'review'
    const [selectedCourse, setSelectedCourse] = useState(null);

    // Upload State
    const [courseNameInput, setCourseNameInput] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, processing, error, success
    const [uploadMessage, setUploadMessage] = useState('');

    // Review State
    const [prerequisites, setPrerequisites] = useState({});
    const [reviewLoading, setReviewLoading] = useState(false);

    useEffect(() => {
        if (view === 'list') fetchCourses();
    }, [view]);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/courses', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch courses');
            const data = await res.json();
            setCourses(data.courses || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'pdf' && ext !== 'pptx') {
                setUploadMessage('This file type isn\'t supported. Please upload a PDF or PPTX.');
                return;
            }
            setSelectedFile(file);
            setUploadMessage('');
            if (!courseNameInput) {
                setCourseNameInput(file.name.replace(/\.[^/.]+$/, ""));
            }
        }
    };

    const runIngestionFlow = async () => {
        if (!selectedFile || !courseNameInput) return;
        setUploadStatus('uploading');
        setUploadMessage('Uploading material...');

        try {
            // 1. Upload File
            const formData = new FormData();
            const renamedFile = new File([selectedFile], `${courseNameInput}.${selectedFile.name.split('.').pop()}`, {
                type: selectedFile.type
            });
            formData.append('files', renamedFile);

            const uploadRes = await fetch('/api/ingest/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json();
                throw new Error(err.message || 'Unable to upload material. Please try again.');
            }

            setUploadStatus('processing');
            setUploadMessage('Processing Course Material...\n✓ Material uploaded\n⏳ Extracting and chunking material\n⏳ Generating prerequisites\nPlease wait...');

            // 2. Generate Prerequisites
            const prereqRes = await fetch('/api/ingest/generate-prerequisites', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ courseName: courseNameInput })
            });

            if (!prereqRes.ok) {
                const err = await prereqRes.json();
                throw new Error(err.message || 'Prerequisite generation failed. Your uploaded material is safely stored, but the course cannot be published until prerequisites are successfully generated/reviewed.');
            }

            setUploadStatus('success');
            setUploadMessage('Course Ready for Review!\n✓ Material uploaded\n✓ Chunks generated\n✓ Prerequisites generated');

        } catch (err) {
            setUploadStatus('error');
            setUploadMessage(err.message || 'Material processing failed. The course was not published. Please try again or upload the material again.');
        }
    };

    const openReview = async (courseName) => {
        setSelectedCourse(courseName);
        setView('review');
        setReviewLoading(true);
        try {
            const res = await fetch(`/api/courses/${courseName}/prerequisites`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error('Failed to load review data');
            const data = await res.json();
            setPrerequisites(data.prerequisites || {});
        } catch (err) {
            alert('Failed to load prerequisites: ' + err.message);
            setView('list');
        } finally {
            setReviewLoading(false);
        }
    };

    const handlePublish = async () => {
        const confirmed = window.confirm('Publish this course?\n\nOnce published, students will be able to use this material in Learnify\'s RAG system.');
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/courses/${selectedCourse}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'published' })
            });

            if (!res.ok) throw new Error('The course could not be published. Your review has not been lost. Please try again.');

            alert('Course Published ✓\n\nStudents can now access this course material.');
            setView('list');
        } catch (err) {
            alert(err.message);
        }
    };

    const handleRemovePrereq = (source, target) => {
        setPrerequisites(prev => {
            const next = { ...prev };
            if (next[source]) {
                next[source] = next[source].filter(t => t !== target);
            }
            return next;
        });
    };

    const saveAndPublish = async () => {
        // Save prereqs first
        try {
            const prereqSave = await fetch(`/api/courses/${selectedCourse}/prerequisites`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prerequisites })
            });
            if (!prereqSave.ok) throw new Error('Failed to save prerequisite edits');
            handlePublish();
        } catch (e) {
            alert(e.message);
        }
    };

    if (view === 'list') {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ color: 'var(--text-primary)', marginTop: 0 }}>My Courses</h2>
                    <button
                        onClick={() => {
                            setUploadStatus('idle');
                            setUploadMessage('');
                            setSelectedFile(null);
                            setCourseNameInput('');
                            setView('upload');
                        }}
                        style={{ background: 'var(--accent-primary)', color: 'black', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        + Upload Course Material
                    </button>
                </div>

                {loading ? <div style={{ color: 'var(--text-secondary)' }}>Loading courses...</div> : (
                    <div style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}>
                        {courses.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>No courses found.</div>
                        ) : courses.map(c => (
                            <div key={c.name} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{c.name}</h3>
                                    <div style={{
                                        display: 'inline-block',
                                        background: c.status === 'published' ? 'rgba(34, 197, 94, 0.2)' : c.status === 'pending_review' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                        color: c.status === 'published' ? '#4ade80' : c.status === 'pending_review' ? '#facc15' : '#60a5fa',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        fontSize: '0.875rem',
                                        fontWeight: 600
                                    }}>
                                        Status: {c.status === 'pending_review' ? 'Pending Review' : c.status === 'published' ? 'Published' : c.status}
                                    </div>
                                </div>
                                {c.status === 'pending_review' && (
                                    <button onClick={() => openReview(c.name)} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Review</button>
                                )}
                                {c.status === 'published' && (
                                    <button disabled style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'not-allowed' }}>View</button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (view === 'upload') {
        return (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <button onClick={() => setView('list')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '1rem' }}>← Back to Courses</button>

                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2rem' }}>
                    <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Upload Course Material</h2>

                    {uploadStatus === 'idle' || uploadStatus === 'error' ? (
                        <>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Course / Subject</label>
                                <input
                                    type="text"
                                    value={courseNameInput}
                                    onChange={(e) => setCourseNameInput(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
                                    placeholder="e.g. DSA"
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '4px' }}
                                />
                            </div>

                            <div style={{ border: '2px dashed var(--border)', padding: '3rem 2rem', textAlign: 'center', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                <input
                                    type="file"
                                    id="fileUpload"
                                    accept=".pdf,.pptx"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="fileUpload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--text-secondary)' }}>📄</span>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedFile ? selectedFile.name : 'Drag & drop your material or Browse Files'}</span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>PDF / PPTX</span>
                                </label>
                            </div>

                            {uploadMessage && uploadStatus === 'error' && (
                                <div style={{ color: 'var(--red)', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', border: '1px solid var(--red)' }}>
                                    {uploadMessage}
                                </div>
                            )}

                            <button
                                onClick={runIngestionFlow}
                                disabled={!selectedFile || !courseNameInput}
                                style={{ width: '100%', padding: '1rem', background: 'var(--accent-primary)', color: 'black', border: 'none', borderRadius: '4px', fontSize: '1.1rem', fontWeight: 600, cursor: (!selectedFile || !courseNameInput) ? 'not-allowed' : 'pointer', opacity: (!selectedFile || !courseNameInput) ? 0.5 : 1 }}
                            >
                                Upload
                            </button>
                        </>
                    ) : uploadStatus === 'success' ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ color: '#4ade80', fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
                            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>Course Ready for Review</h3>
                            <pre style={{ textAlign: 'left', background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '8px', color: 'var(--text-secondary)', fontFamily: 'inherit', margin: '0 0 2rem 0', whiteSpace: 'pre-wrap' }}>
                                {uploadMessage}
                            </pre>
                            <button
                                onClick={() => openReview(courseNameInput)}
                                style={{ padding: '0.75rem 2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Review Prerequisites
                            </button>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }}></div>
                            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Processing Course Material</h3>
                            <pre style={{ textAlign: 'left', background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '8px', color: 'var(--text-secondary)', fontFamily: 'inherit', margin: 0, whiteSpace: 'pre-wrap' }}>
                                {uploadMessage}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (view === 'review') {
        const handlePublish = async () => {
            const confirmed = window.confirm('Publish this course?\n\nOnce published, students will be able to use this material in Learnify\'s RAG system.');
            if (!confirmed) return;

            try {
                const res = await fetch(`/api/courses/${selectedCourse}/status`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 'published' })
                });

                if (!res.ok) throw new Error('The course could not be published. Please try again.');

                alert('Course Published ✓\n\nStudents can now access this course material.');
                setView('list');
            } catch (err) {
                alert(err.message);
            }
        };

        return <TeacherReview courseName={selectedCourse} setView={setView} onPublish={handlePublish} />;
    }

    return null;
}
