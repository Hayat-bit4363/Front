import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        try {
            await register(formData.username, formData.email, formData.password);
            // Navigate to verify email page with email in state
            navigate('/verify-email', { 
                state: { 
                    email: formData.email,
                    username: formData.username,
                    password: formData.password 
                } 
            });
        } catch (err) {
            console.error('Registration error:', err);
            // Display specific validation errors from backend
            if (err.username) {
                setError('Username: ' + (Array.isArray(err.username) ? err.username[0] : err.username));
            } else if (err.email) {
                setError('Email: ' + (Array.isArray(err.email) ? err.email[0] : err.email));
            } else if (err.password) {
                setError('Password: ' + (Array.isArray(err.password) ? err.password[0] : err.password));
            } else if (err.error) {
                setError(err.error);
            } else if (err.non_field_errors) {
                setError(Array.isArray(err.non_field_errors) ? err.non_field_errors[0] : err.non_field_errors);
            } else if (typeof err === 'string') {
                setError(err);
            } else {
                setError('Registration failed. Please check your input and try again.');
            }
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.formCard}>
                <h2 style={styles.title}>Register</h2>
                {error && <p style={styles.error}>{error}</p>}
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        style={styles.input}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        style={styles.input}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        style={styles.input}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        style={styles.input}
                        required
                    />
                    <button type="submit" style={styles.button}>Register</button>
                </form>
                <p style={styles.linkText}>
                    Already have an account? <Link to="/login" style={styles.link}>Login</Link>
                </p>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
        backgroundColor: 'var(--bg-color)'
    },
    formCard: {
        backgroundColor: 'var(--sidebar-bg)', padding: '2rem', borderRadius: '1rem',
        width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    title: { textAlign: 'center', marginBottom: '2rem', color: 'var(--text-primary)' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    input: {
        padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none'
    },
    button: {
        padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
        backgroundColor: 'var(--accent-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold'
    },
    error: { color: '#ef4444', textAlign: 'center' },
    linkText: { textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)' },
    link: { color: 'var(--accent-color)', textDecoration: 'none' }
};

export default RegisterPage;
