import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const VerifyEmailPage = () => {
    const location = useLocation();
    const [email, setEmail] = useState(location.state?.email || '');
    const [username, setUsername] = useState(location.state?.username || '');
    const [password, setPassword] = useState(location.state?.password || '');
    const [code, setCode] = useState('');
    const [msg, setMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const { verifyEmail, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setMsg('');
        try {
            await verifyEmail(email, code);
            navigate('/login');
        } catch (err) {
            console.error('Verify error:', err);
            if (err.response && err.response.data && err.response.data.error) {
                setErrorMsg(err.response.data.error);
            } else if (err.error) {
                setErrorMsg(err.error);
            } else {
                setErrorMsg('Verification failed. Invalid code.');
            }
        }
    };

    const handleResend = async () => {
        setErrorMsg('');
        setMsg('');
        if (!email || !username || !password) {
            setErrorMsg("Missing registration details for resend request. Please register again.");
            return;
        }
        try {
            await register(username, email, password);
            setMsg('OTP has been resent to your email.');
        } catch (err) {
            console.error('Resend error:', err);
            if (err.response && err.response.data && err.response.data.error) {
                setErrorMsg(err.response.data.error);
            } else if (err.error) {
                setErrorMsg(err.error);
            } else {
                setErrorMsg('Failed to resend OTP.');
            }
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.formCard}>
                <h2 style={styles.title}>Verify Email</h2>
                <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '1rem' }}>
                    Please enter the code sent to your email (check console).
                </p>
                {msg && <p style={{ color: '#10b981', textAlign: 'center' }}>{msg}</p>}
                {errorMsg && <p style={styles.error}>{errorMsg}</p>}
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={styles.input}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Verification Code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        style={styles.input}
                        required
                    />
                    <button type="submit" style={styles.button}>Verify</button>
                    <button type="button" onClick={handleResend} style={styles.resendButton}>Resend OTP</button>
                </form>
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
    title: { textAlign: 'center', marginBottom: '1rem', color: 'var(--text-primary)' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    input: {
        padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none'
    },
    button: {
        padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
        backgroundColor: 'var(--accent-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold'
    },
    resendButton: {
        padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--accent-color)',
        backgroundColor: 'transparent', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 'bold'
    },
    error: { color: '#ef4444', textAlign: 'center' }
};

export default VerifyEmailPage;
