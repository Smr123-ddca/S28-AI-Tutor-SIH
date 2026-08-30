import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Download,
  Eye,
  Search,
  CheckCircle,
  File,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { fetchLibraryDocuments } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function LibraryPage() {
  const { session } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

  const subjects = ['All', 'Computer Science', 'Mathematics', 'Physics'];

  useEffect(() => {
    async function loadDocs() {
      const data = await fetchLibraryDocuments(session?.access_token);
      setDocuments(data.documents || []);
    }
    loadDocs();
  }, [session?.access_token]);

  const filteredDocs = documents.filter((doc) => {
    const matchesSubject =
      selectedSubject === 'All' ||
      doc.subject.toLowerCase() === selectedSubject.toLowerCase();
    const matchesSearch =
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.chapter.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="page-container" style={{ paddingBottom: '3.5rem' }}>
      {/* Header */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <Pill color="purple" size="sm" icon={BookOpen}>
            Course Syllabus Repository
          </Pill>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Read-Only Grounded Knowledge Base
          </span>
        </div>
        <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
          Document <span style={{ color: 'var(--color-orange)' }}>Library</span>
        </h1>
        <p className="text-body" style={{ maxWidth: '640px' }}>
          Official textbooks, lecture notes, and slide decks uploaded by your professors. All Learnify responses are directly grounded in these materials.
        </p>
      </section>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}
      >
        <SegmentedControl
          options={subjects}
          value={selectedSubject}
          onChange={setSelectedSubject}
        />

        <div style={{ width: '100%', maxWidth: '340px' }}>
          <div className="search-pill-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename or chapter..."
              className="search-pill-input"
            />
            <button type="button" className="search-pill-btn" aria-label="Search">
              <Search size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="card-white"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '230px'
            }}
          >
            <div>
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <Pill category={doc.subject} size="sm">
                  {doc.subject}
                </Pill>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  {doc.fileSize}
                </span>
              </div>

              {/* Document Title & File Icon */}
              <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: doc.fileType === 'pdf' ? 'var(--color-red-light)' : 'var(--color-orange-subtle)',
                    color: doc.fileType === 'pdf' ? '#dc2626' : 'var(--color-orange)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <FileText size={20} />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--color-ink)',
                      lineHeight: 1.3,
                      marginBottom: '0.25rem',
                      wordBreak: 'break-word'
                    }}
                  >
                    {doc.filename}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {doc.chapter} • {doc.totalChunks} Retrieval Chunks
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Meta & Actions */}
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Uploaded: {doc.uploadDate}
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(doc)}
                  className="btn btn-outline btn-sm"
                  title="Preview"
                >
                  <Eye size={14} /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Downloading verified source: ${doc.filename}`)}
                  className="btn btn-orange btn-sm"
                  title="Download"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(21, 19, 19, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem'
          }}
        >
          <div
            className="card-white"
            style={{
              width: '100%',
              maxWidth: '650px',
              padding: '2rem',
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-xl)',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <Pill category={previewDoc.subject} size="sm" style={{ marginBottom: '0.5rem' }}>
                  {previewDoc.subject}
                </Pill>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                  {previewDoc.filename}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  Uploaded by {previewDoc.uploadedBy} on {previewDoc.uploadDate}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="btn-icon btn-ghost"
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--color-offwhite)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'var(--color-text-primary)'
              }}
            >
              <strong>Curriculum Ingestion Metadata:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                <li>Chapter Coverage: {previewDoc.chapter}</li>
                <li>Vector Store Chunks: {previewDoc.totalChunks} verified segments</li>
                <li>Cosine Retrieval Threshold: &ge; 0.30</li>
                <li>Status: Verified Syllabus Grounding Source</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" size="md" onClick={() => setPreviewDoc(null)}>
                Close
              </Button>
              <Button
                variant="orange"
                size="md"
                onClick={() => {
                  alert(`Downloading: ${previewDoc.filename}`);
                  setPreviewDoc(null);
                }}
                icon={Download}
              >
                Download File
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
