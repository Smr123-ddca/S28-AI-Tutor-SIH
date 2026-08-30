import React, { useState, useEffect } from 'react';
import { AlertTriangle, GraduationCap } from 'lucide-react';
import { Pill } from '../components/common/Pill';
import { Button } from '../components/common/Button';
import { fetchMisconceptions } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MOCK_INTERVENTIONS } from '../services/mockData';

export function TeacherMisconceptions() {
    const { session } = useAuth();
    const [misconceptions, setMisconceptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await fetchMisconceptions(session?.access_token);
                setMisconceptions(data.misconceptions || []);
            } catch (err) {
                console.error('Error fetching misconceptions:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [session?.access_token]);

    const sortedMisconceptions = [...misconceptions].sort(
        (a, b) => b.incorrect_rate - a.incorrect_rate
    );

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
                Student <span style={{ color: 'var(--color-orange)' }}>Misconceptions</span>
            </h1>
            <p className="text-body" style={{ maxWidth: '680px', marginBottom: '2.5rem' }}>
                Analyze aggregated concept failures across the cohort. Leverage AI to automatically deploy remedial learning paths to students struggling with prerequisite dependencies.
            </p>

            <section style={{ marginBottom: '3rem' }}>
                <h2 className="text-h2" style={{ fontSize: '1.35rem', marginBottom: '1.25rem' }}>
                    Class Misconceptions Table
                </h2>
                <div className="card-white" style={{ padding: '0', overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading Diagnostic Metrics...</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--color-offwhite)', borderBottom: '1px solid var(--color-border)' }}>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Syllabus Topic</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Incorrect Rate</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Total Attempts</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Most Common Prerequisite Gap</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedMisconceptions.length === 0 && (
                                        <tr><td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center' }}>No misconception datalogs available.</td></tr>
                                    )}
                                    {sortedMisconceptions.map((item) => {
                                        const isHighAlert = item.incorrect_rate > 0.4;
                                        return (
                                            <tr
                                                key={item.chunk_id}
                                                style={{
                                                    borderBottom: '1px solid var(--color-border)',
                                                    backgroundColor: isHighAlert ? 'var(--color-red-light)' : 'transparent',
                                                    transition: 'background var(--transition-fast)'
                                                }}
                                            >
                                                <td style={{ padding: '1.1rem 1.5rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {isHighAlert && <AlertTriangle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />}
                                                        <span>{item.section_label}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.1rem 1.5rem' }}>
                                                    <span style={{
                                                        fontWeight: 700,
                                                        color: isHighAlert ? '#dc2626' : 'var(--color-ink)',
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        backgroundColor: isHighAlert ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-offwhite)'
                                                    }}>
                                                        {(item.incorrect_rate * 100).toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1.1rem 1.5rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                                    {item.total_attempts} checks
                                                </td>
                                                <td style={{ padding: '1.1rem 1.5rem' }}>
                                                    {item.most_common_gap ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <span style={{ fontWeight: 600, color: isHighAlert ? '#991b1b' : 'var(--color-ink)' }}>
                                                                {item.most_common_gap.section_label}
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem', color: isHighAlert ? '#dc2626' : 'var(--color-text-muted)', fontWeight: 700 }}>
                                                                ({item.most_common_gap.frequency} students)
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <div style={{ marginBottom: '1.25rem' }}>
                    <h2 className="text-h2" style={{ fontSize: '1.35rem' }}>Recommended Automated Remediation Plans</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {MOCK_INTERVENTIONS.map((inter) => (
                        <div
                            key={inter.id}
                            className="card-white"
                            style={{ padding: '1.5rem', borderLeft: `4px solid ${inter.priority === 'Urgent' ? '#ef4444' : 'var(--color-purple)'}` }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-ink)' }}>{inter.topic}</h3>
                                <Pill color={inter.priority === 'Urgent' ? 'red' : 'purple'} size="sm">{inter.priority}</Pill>
                            </div>
                            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                                {inter.recommendation}
                            </p>
                            <Button size="sm" variant="ink" onClick={() => alert(`Remediation Plan launched for ${inter.targetStudents} students.`)}>
                                Deploy Automated Refresher ({inter.targetStudents} students)
                            </Button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
