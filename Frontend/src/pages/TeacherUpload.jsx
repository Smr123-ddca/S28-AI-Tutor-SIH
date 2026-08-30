import React, { useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { uploadCourseDoc } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';

export function TeacherUpload() {
    const { session } = useAuth();

    const [uploadFileName, setUploadFileName] = useState('');
    const [uploadSubject, setUploadSubject] = useState('Computer Science');
    const [uploadChapter, setUploadChapter] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!uploadFileName.trim() || !uploadFile) {
            alert('Please provide a document name and file.');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('files', uploadFile);
            formData.append('courseName', uploadFileName);
            formData.append('subject', uploadSubject);
            formData.append('chapter', uploadChapter);

            await uploadCourseDoc(formData, session?.access_token);

            setUploadSuccess(true);
            setUploadFileName('');
            setUploadChapter('');
            setUploadFile(null);
            setTimeout(() => setUploadSuccess(false), 5000);
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
                Upload Syllabus <span style={{ color: 'var(--color-orange)' }}>Material</span>
            </h1>
            <p className="text-body" style={{ maxWidth: '680px', marginBottom: '2.5rem' }}>
                Inject new authoritative source materials into the Learnify Tutor's RAG architecture.
                Documents are immediately processed (chunked and vectorized) upon successful deployment.
            </p>

            <div className="card-white" style={{ padding: '2rem' }}>
                {uploadSuccess ? (
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-green-subtle)', border: '1.5px dashed var(--color-green)', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ color: '#166534', fontWeight: 700, marginBottom: '0.5rem' }}>Successfully Ingested!</h4>
                        <p style={{ fontSize: '0.85rem', color: '#15803d' }}>
                            Your material is now being parsed by Learnify's agentic pipelines. It will be immediately available to bounds-check responses in student sessions.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleUploadSubmit} style={{ display: 'grid', gap: '1.5rem', maxWidth: '600px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Unique Tracking Name</label>
                            <input
                                type="text"
                                value={uploadFileName}
                                onChange={(e) => setUploadFileName(e.target.value)}
                                placeholder="e.g. CS101_Fall24"
                                style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Subject Pipeline</label>
                            <select
                                value={uploadSubject}
                                onChange={(e) => setUploadSubject(e.target.value)}
                                style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: '#fff' }}
                            >
                                <option>Computer Science</option>
                                <option>Mathematics</option>
                                <option>Physics</option>
                                <option>Engineering</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Chapter (Optional)</label>
                            <input
                                type="text"
                                value={uploadChapter}
                                onChange={(e) => setUploadChapter(e.target.value)}
                                placeholder="e.g. Chapter 4: Data Structures"
                                style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Select PDF Document</label>
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

                        <div style={{ marginTop: '1rem' }}>
                            <Button variant="purple" size="lg" type="submit" style={{ width: '100%' }} disabled={isUploading}>
                                {isUploading ? 'Executing Native Pipeline Ingestion...' : 'Commit Source to Pipeline'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
