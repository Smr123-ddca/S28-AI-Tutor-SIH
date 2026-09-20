import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Copy, Check, Eye } from 'lucide-react';
import { Button } from '../common/Button';
import { fetchTeacherClasses, createClass, fetchClassDetails } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function TeacherClasses({ availableCourses }) {
    const { session } = useAuth();
    const token = session?.access_token;

    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showCreate, setShowCreate] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [newClassSection, setNewClassSection] = useState('');
    const [newCourseId, setNewCourseId] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createdCode, setCreatedCode] = useState('');
    const [copied, setCopied] = useState(false);

    const [selectedClass, setSelectedClass] = useState(null);
    const [classDetails, setClassDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const loadClasses = async () => {
        try {
            const data = await fetchTeacherClasses(token);
            setClasses(data);
        } catch (err) {
            console.error('Failed to load classes', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) loadClasses();
    }, [token]);

    const handleCreateClass = async (e) => {
        e.preventDefault();
        if (!newCourseId || !newClassName) return;

        setIsCreating(true);
        try {
            const res = await createClass(newCourseId, newClassName, newClassSection, token);
            setCreatedCode(res.join_code);
            loadClasses();
        } catch (error) {
            alert(error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(createdCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleViewClass = async (cls) => {
        setSelectedClass(cls);
        setDetailsLoading(true);
        try {
            const data = await fetchClassDetails(cls.id, token);
            setClassDetails(data);
        } catch (error) {
            console.error(error);
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeCreate = () => {
        setShowCreate(false);
        setCreatedCode('');
        setNewClassName('');
        setNewClassSection('');
        setNewCourseId('');
    };

    if (selectedClass) {
        return (
            <div className="card-white" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 className="text-h2" style={{ marginBottom: '0.25rem' }}>{selectedClass.name} {selectedClass.section && `- ${selectedClass.section}`}</h2>
                        <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>
                            Course: {selectedClass.course_name}
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => setSelectedClass(null)}>
                        Back to Classes
                    </Button>
                </div>

                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--color-purple-light)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Join Code</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-purple)' }}>{selectedClass.join_code}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Students</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-ink)' }}>{detailsLoading ? '--' : classDetails?.members?.length || 0}</div>
                    </div>
                </div>

                <h3 className="text-h3" style={{ marginBottom: '1rem' }}>Enrolled Students</h3>
                {detailsLoading ? (
                    <p>Loading members...</p>
                ) : classDetails?.members?.length > 0 ? (
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        {classDetails.members.map((m, idx) => (
                            <div key={idx} style={{ padding: '1rem 1.5rem', borderBottom: idx < classDetails.members.length - 1 ? '1px solid var(--color-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{m.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Joined: {new Date(m.joined_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                        <p style={{ color: 'var(--color-text-secondary)' }}>No students have joined this class yet.</p>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Share the join code <b>{selectedClass.join_code}</b> with your students.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <section style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>My Classes</h3>
                <Button variant="purple" size="sm" onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Create Class
                </Button>
            </div>

            {showCreate && (
                <div className="card-white" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '2px solid var(--color-purple)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h4 className="text-h3">Create New Class</h4>
                        <button onClick={closeCreate} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>
                    </div>

                    {createdCode ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: 'var(--color-green-subtle)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-green)' }}>
                            <h4 style={{ color: '#166534', fontWeight: 700, marginBottom: '0.5rem' }}>Class Created Successfully!</h4>
                            <p style={{ color: '#15803d', marginBottom: '1rem', fontSize: '0.9rem' }}>Share this code with your students so they can join:</p>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', backgroundColor: '#fff', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-purple)', letterSpacing: '1px' }}>
                                {createdCode}
                                <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 0 }} title="Copy Code">
                                    {copied ? <Check size={20} color="#166534" /> : <Copy size={20} />}
                                </button>
                            </div>
                            <div style={{ marginTop: '1.5rem' }}>
                                <Button variant="green" onClick={closeCreate}>Done</Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateClass} style={{ display: 'grid', gap: '1rem', maxWidth: '500px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-secondary)' }}>Source Course</label>
                                <select
                                    value={newCourseId}
                                    onChange={(e) => setNewCourseId(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                    required
                                >
                                    <option value="">Select an active course...</option>
                                    {availableCourses.filter(c => c.status === 'published' || c.status === 'approved').map(c => (
                                        <option key={c.id} value={c.id}>{c.subject || c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-secondary)' }}>Class Name</label>
                                    <input
                                        type="text"
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        placeholder="e.g. DSA Spring 2026"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-secondary)' }}>Section (Optional)</label>
                                    <input
                                        type="text"
                                        value={newClassSection}
                                        onChange={(e) => setNewClassSection(e.target.value)}
                                        placeholder="e.g. A"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <Button variant="outline" type="button" onClick={closeCreate}>Cancel</Button>
                                <Button variant="purple" type="submit" disabled={isCreating || !newCourseId || !newClassName}>
                                    {isCreating ? 'Creating...' : 'Create Class'}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {loading ? (
                <p style={{ color: 'var(--color-text-muted)' }}>Loading classes...</p>
            ) : classes.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ color: 'var(--color-text-secondary)' }}>You haven't created any classes yet.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {classes.map(cls => (
                        <div key={cls.id} className="card-white" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-ink)' }}>{cls.name}</h4>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Course: {cls.course_name}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Join Code</div>
                                    <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{cls.join_code}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Students</div>
                                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                        <Users size={14} /> {cls.student_count}
                                    </div>
                                </div>
                            </div>

                            <Button variant="outline" size="sm" onClick={() => handleViewClass(cls)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Eye size={16} /> Manage Class
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default TeacherClasses;
