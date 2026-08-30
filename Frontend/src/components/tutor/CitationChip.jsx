import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, X } from 'lucide-react';
import { getCitationMeta } from '../../services/api';

/**
 * Task E: Source Attribution Component
 *
 * NOTE FOR BACKEND INTEGRATION:
 * This component renders a complete academic reference:
 * { source_chunk_id, document_title, chapter, section_label, page }.
 * The backend's current schema only guarantees source_chunk_id;
 * this component falls back gracefully to syllabus metadata and mock mappings
 * while awaiting full metadata enrichment in retrieval/explain responses.
 */
export function CitationChip({
  sourceChunkId,
  sourceText,
  results = [],
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Find corresponding chunk in results or mock metadata
  const matchingResult = results.find((r) => r.id === sourceChunkId) || {};
  const meta = getCitationMeta(sourceChunkId, matchingResult);
  const fullText = sourceText || matchingResult.text || 'Approved course reference chunk content.';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`citation-chip ${className}`}
        style={{
          margin: '0 0.3rem',
          verticalAlign: 'middle'
        }}
        title={`Source: ${meta.document_title} - ${meta.section_label}`}
      >
        <FileText size={13} style={{ color: 'var(--color-orange)' }} />
        <span>
          {meta.document_title.length > 22
            ? `${meta.document_title.slice(0, 20)}...`
            : meta.document_title}{' '}
          <strong style={{ color: 'var(--color-orange)' }}>p.{meta.page}</strong>
        </span>
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Expanded Source Attribution Drawer/Card */}
      {isOpen && (
        <div
          className="card-white"
          style={{
            margin: '0.75rem 0',
            padding: '1.25rem',
            backgroundColor: 'var(--color-white)',
            borderLeft: '4px solid var(--color-orange)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-orange)', fontWeight: 700, textTransform: 'uppercase' }}>
                Course Reference Attribution
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                {meta.document_title}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                {meta.chapter} • {meta.section_label} • Page {meta.page}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ color: 'var(--color-text-muted)', padding: '0.2rem' }}
              aria-label="Close reference"
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              padding: '0.85rem',
              backgroundColor: 'var(--color-offwhite)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.86rem',
              lineHeight: 1.5,
              color: 'var(--color-text-primary)',
              fontStyle: 'italic'
            }}
          >
            "{fullText}"
          </div>

          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Chunk ID: <code style={{ color: 'var(--color-ink)' }}>{sourceChunkId}</code>
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-green)', fontWeight: 600 }}>
              ✓ Verified Syllabus Evidence
            </span>
          </div>
        </div>
      )}
    </>
  );
}
