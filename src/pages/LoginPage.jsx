import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.backgroundGlow}></div>
            <div style={styles.content}>
                <div style={styles.brandSection}>
                    <h1 style={styles.brandTitle} className="mobile-hide">Hayat<span style={styles.brandAccent}>Chat</span></h1>
                    <p style={styles.brandTagline} className="mobile-hide">Connect freely, chat securely.</p>
                </div>

                <div style={styles.glassCard} className="mobile-full">
                    <h2 style={styles.formTitle}>Welcome Back</h2>
                    {error && <div style={styles.errorAlert}>{error}</div>}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Username</label>
                            <input
                                type="text"
                                style={styles.input}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Password</label>
                            <input
                                type="password"
                                style={styles.input}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button type="submit" style={styles.button}>
                            Sign In
                        </button>
                    </form>

                    <div style={styles.footer}>
                        <p>Don't have an account? <Link to="/register" style={styles.link}>Create one now</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        position: 'relative',
        overflow: 'hidden',
    },
    backgroundGlow: {
        position: 'absolute',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(15,23,42,0) 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 0,
        animation: 'pulse 10s infinite ease-in-out'
    },
    content: {
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
        width: '90%',
        maxWidth: '400px',
        animation: 'fadeInUp 0.8s ease-out'
    },
    brandSection: {
        textAlign: 'center',
    },
    brandTitle: {
        fontSize: '3rem',
        fontWeight: '800',
        color: '#f8fafc',
        letterSpacing: '-1px',
        marginBottom: '0.5rem',
        background: 'linear-gradient(to right, #fff, #94a3b8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    brandAccent: {
        background: 'linear-gradient(to right, #6366f1, #a855f7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    brandTagline: {
        color: '#94a3b8',
        fontSize: '1.1rem',
    },
    glassCard: {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '1.5rem',
        padding: '2rem',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
    formTitle: {
        color: '#fff',
        fontSize: '1.5rem',
        marginBottom: '1.5rem',
        textAlign: 'center',
        fontWeight: '600',
    },
    errorAlert: {
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        color: '#fca5a5',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        marginBottom: '1.5rem',
        fontSize: '0.9rem',
        textAlign: 'center',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    label: {
        color: '#cbd5e1',
        fontSize: '0.9rem',
        fontWeight: '500',
    },
    input: {
        padding: '0.875rem 1rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        background: 'rgba(15, 23, 42, 0.6)',
        color: '#f8fafc',
        fontSize: '1rem',
        outline: 'none',
        transition: 'all 0.2s',
    },
    button: {
        marginTop: '1rem',
        padding: '0.875rem',
        borderRadius: '0.75rem',
        border: 'none',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: 'white',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'transform 0.1s, opacity 0.2s',
        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
    },
    footer: {
        marginTop: '2rem',
        textAlign: 'center',
        fontSize: '0.9rem',
        color: '#94a3b8',
    },
    link: {
        color: '#818cf8',
        textDecoration: 'none',
        fontWeight: '500',
        marginLeft: '0.25rem',
    }
};

export default LoginPage;
