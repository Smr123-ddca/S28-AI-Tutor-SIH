import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIngestion } from '../../context/IngestionContext';
import { Loader2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

// Single Job Tracker implementing the strict TWO-BOX dynamic model
function JobTrail({ job, onClear }) {
    const navigate = useNavigate();

    // We snapshot "currentStage" locally. 
    // When the backend sends a new stage, we push the old one to "prevStage".
    const [prevStage, setPrevStage] = useState('File Upload');
    const [currentStage, setCurrentStage] = useState(job.stage);
    const [hasPlayedSound, setHasPlayedSound] = useState(false);

    useEffect(() => {
        if (job.stage !== currentStage && job.status !== 'completed' && job.status !== 'error') {
            setPrevStage(currentStage);
            setCurrentStage(job.stage);
        }
    }, [job.stage, currentStage, job.status]);

    // Phase 10: Celebration Sound
    useEffect(() => {
        if (job.status === 'completed' && !hasPlayedSound) {
            setHasPlayedSound(true);
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    const ctx = new AudioContext();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch
                    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
                    gain.gain.setValueAtTime(0, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.5);
                }
            } catch (e) {
                // Silent fallback
            }
        }
    }, [job.status, hasPlayedSound]);

    const handleOpenReview = () => {
        onClear(job.courseName);
        navigate(`/teacher/review?course=${encodeURIComponent(job.courseName)}`);
    };

    // Auto-clear this specific job after 15 seconds of completion/error
    useEffect(() => {
        if (job.status === 'completed' || job.status === 'error') {
            const timer = setTimeout(() => {
                onClear(job.courseName);
            }, 15000);
            return () => clearTimeout(timer);
        }
    }, [job.status, job.courseName, onClear]);

    if (job.status === 'completed') {
        return (
            <div className="card-process-base card-celebration" onClick={handleOpenReview}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.6)', borderRadius: '50%' }}>
                        <Sparkles size={24} style={{ color: '#16a34a' }} />
                    </div>
                    <div>
                        <div className="tracker-status-label label-done">Finished ✦</div>
                        <div className="tracker-title">{job.courseName} is ready for review</div>
                    </div>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
                    Click to open Knowledge Map →
                </div>
            </div>
        );
    }

    if (job.status === 'error') {
        return (
            <div className="card-process-base" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <div className="tracker-status-label" style={{ color: '#dc2626' }}>
                    <AlertCircle size={14} /> Failed processing
                </div>
                <div className="tracker-title" style={{ color: '#991b1b', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                    {job.stage}
                </div>
                <button
                    onClick={() => onClear(job.courseName)}
                    style={{ marginTop: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: '#fee2e2', borderRadius: '4px', color: '#b91c1c' }}>
                    Dismiss
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* ❄ BOX 1: COMPLETED (FROZEN) */}
            <div className="card-process-base card-frost">
                <div className="tracker-status-label label-frost">
                    ❄ Finished
                </div>
                <div className="tracker-title">
                    {prevStage}
                </div>
            </div>

            {/* 🐜 PHYSICAL CONNECTOR TRAIL */}
            <div className="ant-trail-container">
                <div className="ant-trail-line" />
            </div>

            {/* ⚙ BOX 2: ACTIVE (WARM + BREATHING) */}
            <div className="card-process-base card-active">
                <div className="tracker-status-label label-active">
                    <Loader2 size={12} className="animate-spin" /> Working...
                </div>
                <div className="tracker-title">
                    {currentStage || 'Processing...'}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.5)', marginTop: '0.35rem', fontWeight: 600 }}>
                    {job.courseName}
                </div>
            </div>

        </div>
    );
}

export function TeacherIngestionStatus() {
    const { activeJobs } = useIngestion();
    // We maintain a local hidden list to fulfill the requirement:
    // "Completed jobs must NOT remain forever in the active processing trail."
    const [hiddenJobs, setHiddenJobs] = useState([]);

    const visibleJobs = activeJobs.filter(job => !hiddenJobs.includes(job.courseName));

    if (visibleJobs.length === 0) return null;

    const handleClearJob = (courseName) => {
        setHiddenJobs(prev => {
            if (prev.includes(courseName)) return prev;
            return [...prev, courseName];
        });
    };

    // As per RULE 16: "If multiple jobs genuinely need representation... design the smallest possible extension."
    // We render the TWO-BOX trail for the top active job, and a tiny pill for the others.
    const primaryJob = visibleJobs[0];
    const remainingCount = visibleJobs.length - 1;

    return (
        <div className="bodh-tracker-container">
            <JobTrail job={primaryJob} onClear={handleClearJob} />

            {remainingCount > 0 && (
                <div style={{
                    marginTop: '0.75rem',
                    padding: '0.4rem 0.8rem',
                    background: 'var(--color-ink)',
                    color: 'var(--color-white)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    + {remainingCount} other document{remainingCount > 1 ? 's' : ''} processing
                </div>
            )}
        </div>
    );
}
