import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, GraduationCap, LayoutDashboard, Database, Award } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import { StatCard } from '../components/cards/StatCard';
import { PromoIllustration } from '../components/layout/PromoIllustration';
import { fetchLibraryDocuments } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function TeacherHomeLanding() {
    const navigate = useNavigate();
    const { session } = useAuth();

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const docsData = await fetchLibraryDocuments(session?.access_token);
                setDocuments(docsData.documents || []);
            } catch (err) {
                console.error('Error loading teacher stats:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [session?.access_token]);

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            {/* =====================================================================
          HERO SECTION
          ===================================================================== */}
            <section
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '2.5rem',
                    alignItems: 'center',
                    padding: '2.5rem 0 3.5rem',
                    borderBottom: '1px solid var(--color-border)'
                }}
            >
                <div>
                    {/* Eyebrow Trust Badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
                        <Pill color="orange" size="sm" icon={Sparkles}>
                            Learnify Tutor for Teachers
                        </Pill>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                            Structure • Mentorship • Guided Growth
                        </span>
                    </div>

                    {/* Mixed Display Headline */}
                    <h1 className="text-display" style={{ marginBottom: '1.25rem' }}>
                        Turn your course material into a <span style={{ color: 'var(--color-orange)' }}>smarter learning experience</span>.
                    </h1>

                    <p className="text-body" style={{ maxWidth: '520px', marginBottom: '2rem', fontSize: '1.05rem' }}>
                        Upload your course material and let Learnify organize concepts, evaluate assignments, and provide AI-guided grading and remedial pathways.
                    </p>

                    {/* CTA Row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                        <Button
                            variant="orange"
                            size="lg"
                            onClick={() => navigate('/teacher')}
                            icon={Database}
                            iconPosition="right"
                        >
                            Build a Course
                        </Button>
                        <Button
                            variant="ink"
                            size="lg"
                            onClick={() => navigate('/teacher/grading')}
                            icon={Award}
                        >
                            Grading & Submissions
                        </Button>
                    </div>
                </div>

                {/* Right Hero Graphic / Promo Card */}
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PromoIllustration />
                </div>
            </section>

            {/* =====================================================================
          HERO STATS ROW
          ===================================================================== */}
            <section
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.5rem',
                    margin: '3rem 0'
                }}
            >
                <StatCard tag="Curriculum Repository" tagColor="purple" number={loading ? '--' : `${documents.length}`} label="Active Source Documents" />
                <StatCard tag="Semantic Architecture" tagColor="orange" number="C1-C5" label="Enabled Native AI Pipelines" />
                <StatCard tag="Learning Structure" tagColor="yellow" number="Enabled" label="Prerequisite Mappings Generated" />
                <StatCard tag="Class Diagnostic" tagColor="red" number="Live" label="Misconception Tracking Active" />
            </section>
        </div>
    );
}
