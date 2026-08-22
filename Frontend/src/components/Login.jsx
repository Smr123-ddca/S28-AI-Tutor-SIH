import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState('student');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (isSignUp) {
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { role, display_name: displayName }
                    }
                });
                if (signUpError) throw signUpError;

                if (signUpData.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .upsert({ id: signUpData.user.id, role, display_name: displayName });

                    if (profileError) throw profileError;
                }

                setSuccessMsg('Sign up successful! Please check your email to confirm your account.');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (signInError) throw signInError;
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container glass-container" style={{ maxWidth: '400px', margin: '4rem auto', padding: '2.5rem 2rem' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.75rem' }}>{isSignUp ? 'Sign Up' : 'Log In'}</h2>
            {error && <div style={{ color: '#fda4af', backgroundColor: 'rgba(225, 29, 72, 0.2)', marginBottom: '1rem', padding: '0.75rem', border: '1px solid rgba(225, 29, 72, 0.3)', borderRadius: '8px', fontSize: '0.9rem' }}>{error}</div>}
            {successMsg && <div style={{ color: '#86efac', backgroundColor: 'rgba(34, 197, 94, 0.2)', marginBottom: '1rem', padding: '0.75rem', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', fontSize: '0.9rem' }}>{successMsg}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {isSignUp && (
                    <div>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            className="glass-input"
                            onChange={(e) => setDisplayName(e.target.value)}
                            required={isSignUp}
                        />
                    </div>
                )}
                <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email</label>
                    <input
                        type="email"
                        value={email}
                        className="glass-input"
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        className="glass-input"
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {isSignUp && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Role</label>
                        <div style={{ display: 'flex', gap: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    value="student"
                                    checked={role === 'student'}
                                    onChange={(e) => setRole(e.target.value)}
                                    style={{ accentColor: 'var(--amber)' }}
                                /> Student
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    value="teacher"
                                    checked={role === 'teacher'}
                                    onChange={(e) => setRole(e.target.value)}
                                    style={{ accentColor: 'var(--amber)' }}
                                /> Teacher
                            </label>
                        </div>
                    </div>
                )}

                <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '0.75rem' }}>
                    {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
                </button>
            </form>

            <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <button
                    type="button"
                    className="text-btn"
                    onClick={() => setIsSignUp(!isSignUp)}
                >
                    {isSignUp ? 'Log In' : 'Sign Up'}
                </button>
            </p>
        </div>
    );
}
